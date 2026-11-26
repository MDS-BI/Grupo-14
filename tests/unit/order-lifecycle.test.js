// Ciclo de vida de la Orden de Compra: Aprobada → Emitida → Recibida parcialmente
// → Recibida (+ Rechazada), sin saltos (spec FR-045, SC-013).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEntity, addDocument, approveDocument, cancelDocument, updateDocument,
  addReception, loadDocuments, saveDocuments, saveRequisitions, saveReceptions,
  validateDocument, auditForEntity, isOrderOverdue, overdueOrders,
  REQUISITION_STATUS, DOCUMENT_STATUS
} from '../../src/storage.js';
import { setActiveConfig, userConfig, getConfig } from '../../src/module-config.js';
import { setSession, resetSession } from '../../src/auth.js';
import { recordCounts } from '../../src/components/dashboard.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const { APPROVED, ISSUED, PARTIALLY_RECEIVED, RECEIVED, REJECTED } = DOCUMENT_STATUS;
const RECEPTION_USER = { id: 'rec', username: 'rec', name: 'Recepción', role: 'encargado_recepcion', active: true };
// La interfaz envía siempre los campos personalizados obligatorios al editar.
const FORM_FIELDS = { tipoDocumento: 'Orden de Compra', fechaEmision: '2026-01-01' };

function order(status = APPROVED, cantidad = 10){
  const entity = addEntity({
    name: 'Proveedor', code: `PR-${store.size}`, taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios', paymentTerms: 'neto 30', creditLimit: 100000
  });
  return addDocument({
    entityId: entity.entity_id, folio: 1001, startDate: '2026-01-01', endDate: '2026-01-10',
    status, ...FORM_FIELDS,
    lineasDetalle: [{ producto_id: 'SKU-1', descripcion: 'Caja', cantidad, unidadMedida: 'cajas', precioUnitario: 10 }]
  });
}

function forceStatus(id, status){
  saveDocuments(loadDocuments().map(d => (d.id === id ? { ...d, status } : d)));
}

function receive(id, cantidadRecibida){
  setSession(RECEPTION_USER);
  addReception({ orderId: id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida }] });
  resetSession();
}

beforeEach(() => {
  store.clear();
  setActiveConfig(userConfig);
  resetSession();
});

afterEach(() => resetSession());

describe('statusLifecycle configurado', () => {
  it('incluye "Recibida parcialmente" entre Emitida y Recibida', () => {
    const lc = getConfig().statusLifecycle;
    expect(lc.statuses).toContain(PARTIALLY_RECEIVED);
    expect(lc.transitions[ISSUED]).toEqual(expect.arrayContaining([PARTIALLY_RECEIVED, RECEIVED, REJECTED]));
    expect(lc.transitions[PARTIALLY_RECEIVED]).toEqual([RECEIVED]);
  });
});

describe('emisión (Emitida) sin saltar estados', () => {
  it('emite desde Aprobada', () => {
    const doc = order(APPROVED);
    expect(approveDocument(doc.id).status).toBe(ISSUED);
  });

  it.each([REJECTED, RECEIVED, PARTIALLY_RECEIVED, ISSUED, ''])(
    'impide emitir un documento en estado "%s"', (status) => {
      const doc = order(APPROVED);
      forceStatus(doc.id, status);
      expect(() => approveDocument(doc.id)).toThrow(/Aprobada/);
      expect(loadDocuments()[0].status).toBe(status);
    }
  );
});

describe('recepción (Recibida) solo a través de recepciones registradas', () => {
  it('impide marcar manualmente una orden emitida como Recibida', () => {
    const doc = order(APPROVED);
    approveDocument(doc.id);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: RECEIVED })).toThrow(/recepci/i);
    expect(loadDocuments()[0].status).toBe(ISSUED);
  });

  it('impide marcar manualmente una orden como Recibida parcialmente', () => {
    const doc = order(APPROVED);
    approveDocument(doc.id);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: PARTIALLY_RECEIVED })).toThrow(/recepci/i);
  });

  it('impide pasar a Recibida una orden que nunca fue emitida', () => {
    const doc = order(APPROVED);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: RECEIVED })).toThrow();
    expect(loadDocuments()[0].status).toBe(APPROVED);
  });

  it('impide crear una orden directamente en Recibida', () => {
    expect(() => order(RECEIVED)).toThrow(/recepci/i);
  });

  it('avanza Emitida → Recibida parcialmente → Recibida registrando recepciones', () => {
    const doc = order(APPROVED, 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(loadDocuments()[0].status).toBe(PARTIALLY_RECEIVED);
    expect(loadDocuments()[0].recepcionEstado).toBe('parcial');
    receive(doc.id, 6);
    expect(loadDocuments()[0].status).toBe(RECEIVED);
    expect(loadDocuments()[0].recepcionEstado).toBe('completa');
  });

  it('permite editar otros campos de una orden recibida parcialmente sin cambiar su estado', () => {
    const doc = order(APPROVED, 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(updateDocument(doc.id, { ...FORM_FIELDS, notes: 'Seguimiento' }).status).toBe(PARTIALLY_RECEIVED);
  });
});

describe('rechazo/cancelación', () => {
  it('permite rechazar una orden emitida sin recepciones', () => {
    const doc = order(APPROVED);
    approveDocument(doc.id);
    expect(cancelDocument(doc.id).status).toBe(REJECTED);
  });

  it('impide rechazar una orden con una recepción parcial confirmada', () => {
    const doc = order(APPROVED, 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(() => cancelDocument(doc.id)).toThrow(/No se puede rechazar/);
    expect(loadDocuments()[0].status).toBe(PARTIALLY_RECEIVED);
  });
});

describe('contadores del panel', () => {
  it('cuenta órdenes emitidas (alguna vez emitidas y no rechazadas), solicitudes pendientes y recepciones', () => {
    const statuses = [APPROVED, ISSUED, PARTIALLY_RECEIVED, RECEIVED, REJECTED];
    saveDocuments(statuses.map((status, i) => ({ id: `d${i}`, status })));
    saveRequisitions([
      { id: 'r1', status: REQUISITION_STATUS.PENDING },
      { id: 'r2', status: REQUISITION_STATUS.PENDING },
      { id: 'r3', status: REQUISITION_STATUS.APPROVED },
      { id: 'r4', status: REQUISITION_STATUS.REJECTED }
    ]);
    saveReceptions([{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }]);
    const counts = recordCounts();
    expect(counts.orders).toBe(3);
    expect(counts.requisitions).toBe(2);
    expect(counts.receptions).toBe(3);
    expect(counts.documents).toBe(statuses.length);
  });
});

describe('T139 - fecha estimada y dirección de entrega', () => {
  function payload(extra = {}){
    return {
      entityId: addEntity({ name: 'Proveedor', code: 'P-1' }).entity_id,
      folio: 1001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      status: APPROVED,
      ...FORM_FIELDS,
      ...extra
    };
  }

  it('valida formato y límites de la fecha estimada', () => {
    expect(validateDocument(payload({ fechaEstimadaEntrega: '2026-01-05' })).valid).toBe(true);
    expect(validateDocument(payload({ fechaEstimadaEntrega: '2025-12-31' })).errors.fechaEstimadaEntrega).toMatch(/anterior/);
    expect(validateDocument(payload({ fechaEstimadaEntrega: '2026-01-11' })).errors.fechaEstimadaEntrega).toMatch(/posterior/);
    expect(validateDocument(payload({ fechaEstimadaEntrega: '2026-02-30' })).errors.fechaEstimadaEntrega).toMatch(/válida/);
  });

  it('conserva la dirección y las instrucciones de despacho', () => {
    const doc = addDocument(payload({
      fechaEstimadaEntrega: '2026-01-05',
      direccionEntrega: 'Bodega norte',
      instruccionesDespacho: 'Llamar al vigilante'
    }));
    expect(doc.fechaEstimadaEntrega).toBe('2026-01-05');
    expect(doc.direccionEntrega).toBe('Bodega norte');
    expect(doc.instruccionesDespacho).toBe('Llamar al vigilante');
  });

  it('exige motivo y audita el cambio de fecha', () => {
    const doc = order(APPROVED);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, fechaEstimadaEntrega: '2026-01-05' })).toThrow(/motivo/);

    const updated = updateDocument(doc.id, {
      ...FORM_FIELDS,
      fechaEstimadaEntrega: '2026-01-05',
      direccionEntrega: 'Bodega sur',
      motivoCambioEntrega: 'Cambio confirmado por el proveedor'
    });
    expect(updated.fechaEstimadaEntrega).toBe('2026-01-05');
    expect(updated.direccionEntrega).toBe('Bodega sur');
    expect(updated.revision).toBe(2);
    const change = auditForEntity('documento', doc.id).find(e => e.accion === 'cambiar_fecha_entrega');
    expect(change).toMatchObject({
      entidadTipo: 'documento',
      entidadId: doc.id,
      estadoNuevo: '2026-01-05',
      motivo: 'Cambio confirmado por el proveedor',
      revision: 2
    });
  });

  it('detecta atrasos solo en estados operativos', () => {
    const doc = order(APPROVED);
    const updated = updateDocument(doc.id, {
      ...FORM_FIELDS,
      fechaEstimadaEntrega: '2026-01-05',
      motivoCambioEntrega: 'Fecha acordada'
    });
    expect(isOrderOverdue(updated, '2026-01-06')).toBe(true);
    expect(isOrderOverdue(updated, '2026-01-05')).toBe(false);
    expect(isOrderOverdue({ status: ISSUED, fechaEstimadaEntrega: 'no-fecha' }, '2026-01-10')).toBe(false);
    forceStatus(doc.id, RECEIVED);
    expect(isOrderOverdue(loadDocuments()[0], '2026-01-10')).toBe(false);
  });

  it('enumera solo órdenes vencidas emitidas o recibidas parcialmente', () => {
    const issued = order(APPROVED);
    updateDocument(issued.id, { ...FORM_FIELDS, fechaEstimadaEntrega: '2026-01-05', motivoCambioEntrega: 'Fecha acordada' });
    approveDocument(issued.id);

    const partial = order(APPROVED);
    updateDocument(partial.id, { ...FORM_FIELDS, fechaEstimadaEntrega: '2026-01-05', motivoCambioEntrega: 'Fecha acordada' });
    approveDocument(partial.id);
    receive(partial.id, 4);

    const received = order(APPROVED);
    updateDocument(received.id, { ...FORM_FIELDS, fechaEstimadaEntrega: '2026-01-05', motivoCambioEntrega: 'Fecha acordada' });
    forceStatus(received.id, RECEIVED);

    const overdue = overdueOrders('2026-02-01').map(d => d.id);
    expect(overdue).toEqual(expect.arrayContaining([issued.id, partial.id]));
    expect(overdue).not.toContain(received.id);
  });
});

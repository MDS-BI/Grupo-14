// Ciclo de vida de la Orden de Compra: Emitida (aprobado) → Recibida parcialmente
// → Recibida (recibido) → Pagada (facturado), sin saltos (spec FR-045, SC-013).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEntity, addDocument, approveDocument, cancelDocument, updateDocument,
  addReception, loadDocuments, saveDocuments, saveRequisitions, saveReceptions,
  REQUISITION_STATUS
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

const RECEPTION_USER = { id: 'rec', username: 'rec', name: 'Recepción', role: 'encargado_recepcion', active: true };

function order(status = 'cotización', cantidad = 10){
  const entity = addEntity({
    name: 'Proveedor', code: `PR-${store.size}`, taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios', paymentTerms: 'neto 30', creditLimit: 100000
  });
  return addDocument({
    entityId: entity.entity_id, folio: 1001, startDate: '2026-01-01', endDate: '2026-01-10',
    status, tipoDocumento: 'Orden de Compra', fechaEmision: '2026-01-01',
    lineasDetalle: [{ producto_id: 'SKU-1', descripcion: 'Caja', cantidad, unidadMedida: 'cajas', precioUnitario: 10 }]
  });
}

// La interfaz envía siempre los campos personalizados obligatorios al editar.
const FORM_FIELDS = { tipoDocumento: 'Orden de Compra', fechaEmision: '2026-01-01' };

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
  it('incluye el estado intermedio "recibido parcialmente" entre aprobado y recibido', () => {
    const lc = getConfig().statusLifecycle;
    expect(lc.statuses).toContain('recibido parcialmente');
    expect(lc.transitions.aprobado).toEqual(expect.arrayContaining(['recibido parcialmente', 'recibido', 'cancelado']));
    expect(lc.transitions['recibido parcialmente']).toEqual(['recibido']);
  });
});

describe('aprobación (Emitida) sin saltar estados', () => {
  it('aprueba desde cotización', () => {
    const doc = order('cotización');
    expect(approveDocument(doc.id).status).toBe('aprobado');
  });

  it.each(['borrador', 'cancelado', 'recibido', 'facturado', 'aprobado'])(
    'impide aprobar un documento en estado "%s"', (status) => {
      const doc = order('cotización');
      forceStatus(doc.id, status);
      expect(() => approveDocument(doc.id)).toThrow(/cotización/);
      expect(loadDocuments()[0].status).toBe(status);
    }
  );
});

describe('recepción (Recibida) solo a través de recepciones registradas', () => {
  it('impide marcar manualmente una orden emitida como recibida', () => {
    const doc = order('cotización');
    approveDocument(doc.id);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: 'recibido' })).toThrow(/recepci/i);
    expect(loadDocuments()[0].status).toBe('aprobado');
  });

  it('impide marcar manualmente una orden como recibida parcialmente', () => {
    const doc = order('cotización');
    approveDocument(doc.id);
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: 'recibido parcialmente' })).toThrow(/recepci/i);
  });

  it('impide pasar a recibido una orden que nunca fue emitida', () => {
    const doc = order('cotización');
    expect(() => updateDocument(doc.id, { ...FORM_FIELDS, status: 'recibido' })).toThrow();
    expect(loadDocuments()[0].status).toBe('cotización');
  });

  it('avanza aprobado → recibido parcialmente → recibido registrando recepciones', () => {
    const doc = order('cotización', 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(loadDocuments()[0].status).toBe('recibido parcialmente');
    receive(doc.id, 6);
    expect(loadDocuments()[0].status).toBe('recibido');
  });

  it('permite editar otros campos de una orden recibida parcialmente sin cambiar su estado', () => {
    const doc = order('cotización', 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(updateDocument(doc.id, { ...FORM_FIELDS, notes: 'Seguimiento' }).status).toBe('recibido parcialmente');
  });

  it('permite facturar (Pagada) una orden recibida por completo', () => {
    const doc = order('cotización', 2);
    approveDocument(doc.id);
    receive(doc.id, 2);
    expect(updateDocument(doc.id, { ...FORM_FIELDS, status: 'facturado' }).status).toBe('facturado');
  });
});

describe('cancelación', () => {
  it('permite cancelar una orden emitida sin recepciones', () => {
    const doc = order('cotización');
    approveDocument(doc.id);
    expect(cancelDocument(doc.id).status).toBe('cancelado');
  });

  it('impide cancelar una orden con una recepción parcial confirmada', () => {
    const doc = order('cotización', 10);
    approveDocument(doc.id);
    receive(doc.id, 4);
    expect(() => cancelDocument(doc.id)).toThrow();
    expect(loadDocuments()[0].status).toBe('recibido parcialmente');
  });
});

describe('contadores del panel', () => {
  it('cuenta órdenes emitidas (alguna vez emitidas y no canceladas), solicitudes pendientes y recepciones', () => {
    const statuses = ['borrador', 'cotización', 'aprobado', 'recibido parcialmente', 'recibido', 'facturado', 'cancelado'];
    saveDocuments(statuses.map((status, i) => ({ id: `d${i}`, status })));
    saveRequisitions([
      { id: 'r1', status: REQUISITION_STATUS.PENDING },
      { id: 'r2', status: REQUISITION_STATUS.PENDING },
      { id: 'r3', status: REQUISITION_STATUS.APPROVED },
      { id: 'r4', status: REQUISITION_STATUS.REJECTED }
    ]);
    saveReceptions([{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }]);
    const counts = recordCounts();
    expect(counts.orders).toBe(4);
    expect(counts.requisitions).toBe(2);
    expect(counts.receptions).toBe(3);
    expect(counts.documents).toBe(statuses.length);
  });
});

// Ciclo de vida de la Orden de Compra: Aprobada → Emitida → Recibida parcialmente
// → Recibida (+ Rechazada), sin saltos (spec FR-045, SC-013).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEntity, addDocument, approveDocument, cancelDocument, updateDocument,
  addReception, loadDocuments, saveDocuments, saveRequisitions, saveReceptions,
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

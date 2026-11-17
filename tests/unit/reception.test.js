import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEntity, addDocument, approveDocument, loadDocuments,
  validateReception, addReception, loadReceptions, ordersPendingReception,
  receivedQuantityForLine, pendingQuantityForLine
} from '../../src/storage.js';
import { setActiveConfig, userConfig } from '../../src/module-config.js';
import { setSession, resetSession } from '../../src/auth.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const RECEPTION_USER = { id: 'rec', username: 'rec', name: 'Recepción', role: 'encargado_recepcion', active: true };

function approvedOrder(cantidad = 10){
  const entity = addEntity({
    name: 'Proveedor',
    code: 'PR-1',
    taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios',
    paymentTerms: 'neto 30',
    creditLimit: 100000
  });
  const draft = addDocument({
    entityId: entity.entity_id,
    folio: 1001,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    status: 'cotización',
    tipoDocumento: 'Orden de Compra',
    fechaEmision: '2026-01-01',
    lineasDetalle: [{ producto_id: 'SKU-1', descripcion: 'Caja', cantidad, unidadMedida: 'cajas', precioUnitario: 10 }]
  });
  setSession(RECEPTION_USER);
  return approveDocument(draft.id);
}

beforeEach(() => {
  store.clear();
  setActiveConfig(userConfig);
  setSession(RECEPTION_USER);
});

afterEach(() => resetSession());

describe('reception validation', () => {
  it('rejects negative or non numeric quantities', () => {
    const order = approvedOrder();
    const negative = validateReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: -1 }] });
    expect(negative.valid).toBe(false);
    expect(negative.errors['linea-0-cantidadRecibida']).toBeTruthy();
    const notNumber = validateReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 'abc' }] });
    expect(notNumber.errors['linea-0-cantidadRecibida']).toBeTruthy();
  });

  it('rejects quantities above the pending amount', () => {
    const order = approvedOrder(5);
    const result = validateReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 6 }] });
    expect(result.errors['linea-0-cantidadRecibida']).toContain('pendiente');
  });

  it('requires a rejection reason when rejecting units', () => {
    const order = approvedOrder();
    const result = validateReception({
      orderId: order.id,
      lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 0, cantidadRechazada: 2 }]
    });
    expect(result.errors['linea-0-motivoRechazo']).toBeTruthy();
  });

  it('restricts reception to the reception role', () => {
    const order = approvedOrder();
    setSession({ id: 'sol', username: 'sol', name: 'Sol', role: 'solicitante', active: true });
    const result = validateReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 1 }] });
    expect(result.errors.role).toBeTruthy();
  });

  it('refuses orders that are not approved or partially received', () => {
    const order = approvedOrder();
    const docs = loadDocuments();
    docs[0] = { ...docs[0], status: 'cancelado' };
    localStorage.setItem('erp_base_module:documents', JSON.stringify(docs));
    const result = validateReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 1 }] });
    expect(result.errors.orderId).toContain('emitidas');
  });
});

describe('reception storage', () => {
  it('stores a partial reception and marks the order as partially received', () => {
    const order = approvedOrder(10);
    const reception = addReception({
      orderId: order.id,
      responsable: 'Raúl',
      observaciones: 'Faltaron cajas',
      lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 4, cantidadRechazada: 1, motivoRechazo: 'Dañada' }]
    });
    expect(loadReceptions()).toHaveLength(1);
    expect(reception.fechaRecepcion).toBeTruthy();
    expect(reception.responsable).toBe('Raúl');
    expect(reception.lineas[0].cantidadRecibida).toBe(4);
    expect(reception.lineas[0].cantidadRechazada).toBe(1);
    expect(loadDocuments()[0].status).toBe('recibido parcialmente');
    expect(receivedQuantityForLine(order.id, 0)).toBe(4);
    expect(pendingQuantityForLine(loadDocuments()[0], 0)).toBe(6);
  });

  it('accumulates multiple receptions without overwriting previous records', () => {
    const order = approvedOrder(10);
    addReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 3 }] });
    addReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 2 }] });
    expect(loadReceptions()).toHaveLength(2);
    expect(receivedQuantityForLine(order.id, 0)).toBe(5);
    expect(pendingQuantityForLine(loadDocuments()[0], 0)).toBe(5);
  });

  it('marks the order as received once all pending units arrive', () => {
    const order = approvedOrder(10);
    addReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 4 }] });
    addReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 6 }] });
    expect(loadDocuments()[0].status).toBe('recibido');
    expect(ordersPendingReception()).toHaveLength(0);
  });

  it('lists approved and partially received orders in the inbox', () => {
    const order = approvedOrder(10);
    expect(ordersPendingReception().map(o => o.id)).toEqual([order.id]);
    addReception({ orderId: order.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 1 }] });
    expect(ordersPendingReception()).toHaveLength(1);
  });
});

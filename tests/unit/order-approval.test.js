import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addEntity, addDocument, approveDocument, cancelDocument, nextFolio, loadDocuments
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

const commercialEntity = (overrides = {}) => addEntity({
  name: 'Proveedor',
  code: 'PR-1',
  taxId: 'RFC123456789',
  categoriaProveedor: 'Servicios',
  paymentTerms: 'neto 30',
  creditLimit: 10000,
  ...overrides
});

const draftOrder = (entityId, overrides = {}) => addDocument({
  entityId,
  folio: 1001,
  startDate: '2026-01-01',
  endDate: '2026-01-10',
  subtotal: 500,
  discount: 0,
  taxAmount: 80,
  totalAmount: 580,
  status: 'cotización',
  tipoDocumento: 'Orden de Compra',
  fechaEmision: '2026-01-01',
  ...overrides
});

beforeEach(() => {
  store.clear();
  setActiveConfig(userConfig);
  setSession({ id: 'com', username: 'com', name: 'Compras', role: 'encargado_compras', active: true });
});

afterEach(() => resetSession());

describe('order approval', () => {
  it('requires the provider commercial data before approving', () => {
    const entity = addEntity({ name: 'Incompleto', code: 'IN-1', taxId: 'RFC1' });
    const order = draftOrder(entity.entity_id);
    expect(() => approveDocument(order.id)).toThrow(/Faltan datos comerciales/);
  });

  it('blocks approval when the total exceeds the provider credit limit', () => {
    const entity = commercialEntity({ creditLimit: 100 });
    const order = draftOrder(entity.entity_id, { totalAmount: 500, subtotal: 431 });
    expect(() => approveDocument(order.id)).toThrow(/límite de crédito/);
    expect(loadDocuments()[0].status).toBe('cotización');
  });

  it('approves the order and assigns the official OC series and folio', () => {
    const entity = commercialEntity();
    const order = draftOrder(entity.entity_id);
    const approved = approveDocument(order.id);
    expect(approved.status).toBe('aprobado');
    expect(approved.series).toBe('OC');
    expect(approved.folio).toBe(1001);
    expect(approved.approvedAt).toBeTruthy();
  });

  it('increments the official folio for the next approved order', () => {
    expect(nextFolio('OC')).toBe(1001);
    const entity = commercialEntity();
    const first = draftOrder(entity.entity_id);
    approveDocument(first.id);
    expect(nextFolio('OC')).toBe(1002);
    const second = draftOrder(entity.entity_id, { folio: 1002 });
    expect(approveDocument(second.id).folio).toBe(1002);
  });

  it('cancels a non-final order', () => {
    const entity = commercialEntity();
    const order = draftOrder(entity.entity_id);
    const cancelled = cancelDocument(order.id);
    expect(cancelled.status).toBe('cancelado');
    expect(cancelled.cancelledAt).toBeTruthy();
  });

  it('refuses to cancel a received or already cancelled order', () => {
    const entity = commercialEntity();
    const order = draftOrder(entity.entity_id);
    cancelDocument(order.id);
    expect(() => cancelDocument(order.id)).toThrow(/No se puede cancelar/);
    const received = draftOrder(entity.entity_id, { folio: 1002, status: 'recibido' });
    expect(() => cancelDocument(received.id)).toThrow(/No se puede cancelar/);
  });
});

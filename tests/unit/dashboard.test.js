import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetSession } from '../../src/auth.js';
import { setActiveConfig } from '../../src/module-config.js';
import {
  DOCUMENT_STATUS,
  REQUISITION_STATUS,
  dashboardMetrics,
  isOrderOverdue,
  monthSpend,
  overdueOrders,
  saveDocuments,
  saveEntities,
  saveReceptions,
  saveRequisitions
} from '../../src/storage.js';

const store = new Map();

globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

const NOW = '2026-11-20';

function doc(id, overrides = {}){
  return {
    id,
    entity_id: 'prov-1',
    series: 'OC',
    folio: Number(id.replace(/\D/g, '')) + 1000,
    createdAt: '2026-11-02T10:00:00.000Z',
    status: DOCUMENT_STATUS.ISSUED,
    totalAmount: 0,
    ...overrides
  };
}

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
});

afterEach(() => {
  resetSession();
});

describe('T123 - KPIs, gasto del mes y OCs atrasadas', () => {
  it('calcula el gasto del mes con montos redondeados y excluye estados y meses ajenos', () => {
    saveDocuments([
      doc('1', { status: DOCUMENT_STATUS.ISSUED, totalAmount: 100 }),
      doc('2', { status: DOCUMENT_STATUS.PARTIALLY_RECEIVED, totalAmount: undefined, subtotal: 200 }),
      doc('3', { status: DOCUMENT_STATUS.RECEIVED, totalAmount: 50 }),
      doc('4', { status: DOCUMENT_STATUS.PAID, totalAmount: 999, createdAt: '2026-10-31T23:00:00.000Z' }),
      doc('5', { status: DOCUMENT_STATUS.REJECTED, totalAmount: 999 }),
      doc('6', { status: '', totalAmount: 999 })
    ]);

    expect(monthSpend(NOW)).toBe(350);
  });

  it('detecta atrasos sólo en órdenes emitidas o recibidas parcialmente con fecha vencida', () => {
    const documents = [
      doc('1', { fechaEstimadaEntrega: '2026-11-10' }),
      doc('2', { status: DOCUMENT_STATUS.PARTIALLY_RECEIVED, fechaEstimadaEntrega: '2026-11-01' }),
      doc('3', { status: DOCUMENT_STATUS.RECEIVED, fechaEstimadaEntrega: '2026-01-01' }),
      doc('4', { status: DOCUMENT_STATUS.PAID, fechaEstimadaEntrega: '2026-01-01' }),
      doc('5', { status: DOCUMENT_STATUS.REJECTED, fechaEstimadaEntrega: '2026-01-01' }),
      doc('6', { fechaEstimadaEntrega: '2026-12-01' }),
      doc('7', { fechaEstimadaEntrega: 'fecha-invalida' })
    ];

    expect(documents.filter((order) => isOrderOverdue(order, NOW)).map((order) => order.id)).toEqual(['1', '2']);
    saveDocuments(documents);
    expect(overdueOrders(NOW).map((order) => order.id)).toEqual(['1', '2']);
  });

  it('compone todos los KPIs del panel con las colecciones vigentes', () => {
    saveEntities([
      { id: 'e1', entity_id: 'prov-1', name: 'Proveedor Uno', code: 'P-1' },
      { id: 'e2', entity_id: 'prov-2', name: 'Proveedor Dos', code: 'P-2' }
    ]);
    saveDocuments([
      doc('1', { status: DOCUMENT_STATUS.ISSUED, totalAmount: 100, fechaEstimadaEntrega: '2026-11-10' }),
      doc('2', { status: DOCUMENT_STATUS.PARTIALLY_RECEIVED, subtotal: 200, totalAmount: undefined, fechaEstimadaEntrega: '2026-11-01' }),
      doc('3', { status: DOCUMENT_STATUS.RECEIVED, totalAmount: 50, fechaEstimadaEntrega: '2026-11-05' }),
      doc('4', { status: DOCUMENT_STATUS.PAID, totalAmount: 999, createdAt: '2026-10-01T00:00:00.000Z' }),
      doc('5', { status: DOCUMENT_STATUS.REJECTED, totalAmount: 999 }),
      doc('6', { status: '', totalAmount: 999 })
    ]);
    saveRequisitions([
      { id: 'r1', department: 'TI', status: REQUISITION_STATUS.PENDING },
      { id: 'r2', department: 'Compras', status: REQUISITION_STATUS.PENDING },
      { id: 'r3', department: 'TI', status: REQUISITION_STATUS.APPROVED }
    ]);
    saveReceptions([{ id: 'rec-1', orderId: '1' }]);

    expect(dashboardMetrics(NOW)).toEqual({
      entities: 2,
      documents: 6,
      pendingApprovals: 2,
      issuedOrders: 3,
      overdueOrders: 2,
      monthSpend: 350,
      pendingReceptions: 2
    });
  });

  it('reduce los KPIs a cero cuando no hay registros', () => {
    expect(dashboardMetrics(NOW)).toEqual({
      entities: 0,
      documents: 0,
      pendingApprovals: 0,
      issuedOrders: 0,
      overdueOrders: 0,
      monthSpend: 0,
      pendingReceptions: 0
    });
  });
});

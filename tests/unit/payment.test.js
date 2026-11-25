import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import { resetSession } from '../../src/auth.js';
import {
  addEntity, addDocument, loadDocuments, patchDocument, payOrder, clearAll
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function receivedOrder(){
  const entity = addEntity({ name: 'Proveedor', code: 'PV-1' });
  const doc = addDocument({
    entityId: entity.entity_id,
    folio: 1001,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    lineasDetalle: [
      { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 }
    ]
  });
  return patchDocument(doc.id, { status: 'Recibida' });
}

beforeEach(() => {
  clearAll();
  setActiveConfig(null);
  resetSession();
});

describe('pago de orden recibida', () => {
  it('cierra la orden en estado Pagada cuando factura y monto coinciden', () => {
    const doc = receivedOrder();
    const paid = payOrder(doc.id, {
      factura: 'DTE-123',
      monto: String(doc.totalAmount),
      fechaPago: '2026-01-20'
    });
    expect(paid.status).toBe('Pagada');
    expect(paid.factura).toBe('DTE-123');
    expect(paid.montoPagado).toBe(doc.totalAmount);
  });

  it('rechaza montos distintos al total recepcionado', () => {
    const doc = receivedOrder();
    expect(() => payOrder(doc.id, {
      factura: 'DTE-123',
      monto: doc.totalAmount + 1,
      fechaPago: '2026-01-20'
    })).toThrow(/coincidir/);
    expect(loadDocuments()[0].status).toBe('Recibida');
  });

  it('rechaza pagar una orden que no esté completamente recibida', () => {
    const entity = addEntity({ name: 'Proveedor', code: 'PV-2' });
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 1002,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 1, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });
    expect(() => payOrder(doc.id, {
      factura: 'DTE-124',
      monto: doc.totalAmount,
      fechaPago: '2026-01-20'
    })).toThrow(/recibida por completo/);
  });
});

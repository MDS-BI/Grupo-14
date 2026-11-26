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

describe('T117 - tolerancia, crédito y bloqueo posterior al pago', () => {
  function receivedOrderWithCredit(){
    const entity = addEntity({ name: 'Proveedor con crédito', code: 'PV-CR', creditLimit: 10000 });
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 3001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });
    return { entity, doc: patchDocument(doc.id, { status: 'Recibida' }) };
  }

  it('acepta una diferencia de 0,01 CLP sin nota de ajuste', () => {
    const { doc } = receivedOrderWithCredit();
    const paid = payOrder(doc.id, {
      factura: 'DTE-201',
      monto: Number((doc.totalAmount + 0.01).toFixed(2)),
      fechaPago: '2026-01-20'
    });
    expect(paid.status).toBe('Pagada');
    expect(paid.diferenciaPago).toBeCloseTo(0.01, 2);
    expect(paid.notaAjuste).toBeUndefined();
  });

  it('exige nota cuando la diferencia supera 0,01 CLP y la conserva', () => {
    const { doc } = receivedOrderWithCredit();
    const amount = Number((doc.totalAmount + 0.02).toFixed(2));
    expect(() => payOrder(doc.id, {
      factura: 'DTE-202', monto: amount, fechaPago: '2026-01-20'
    })).toThrow(/nota de ajuste/);

    const paid = payOrder(doc.id, {
      factura: 'DTE-202', monto: amount, fechaPago: '2026-01-20',
      nota: 'Ajuste por flete'
    });
    expect(paid.status).toBe('Pagada');
    expect(paid.notaAjuste).toBe('Ajuste por flete');
    expect(paid.diferenciaPago).toBeCloseTo(0.02, 2);
  });

  it('bloquea el pago antes de Recibida, incluso en Recibida parcialmente', () => {
    const entity = addEntity({ name: 'Proveedor bloqueado', code: 'PV-BL' });
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 3002,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      status: 'Emitida',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 1, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });
    const payment = { factura: 'DTE-203', monto: doc.totalAmount, fechaPago: '2026-01-20' };
    expect(() => payOrder(doc.id, payment)).toThrow(/recibida por completo/);

    patchDocument(doc.id, { status: 'Recibida parcialmente' });
    expect(() => payOrder(doc.id, payment)).toThrow(/recibida por completo/);
    expect(loadDocuments()[0].status).toBe('Recibida parcialmente');
  });

  it('actualiza el crédito usado y deja la orden en modo solo lectura tras pagar', async () => {
    const { entity, doc } = receivedOrderWithCredit();
    const { creditUsedForEntity, availableCreditForEntity, updateDocument } = await import('../../src/storage.js');
    expect(creditUsedForEntity(entity.entity_id)).toBe(0);

    const paid = payOrder(doc.id, {
      factura: 'DTE-204', monto: doc.totalAmount, fechaPago: '2026-01-20'
    });
    expect(creditUsedForEntity(entity.entity_id)).toBe(paid.montoPagado);
    expect(availableCreditForEntity(entity.entity_id)).toBeCloseTo(10000 - paid.montoPagado, 2);

    expect(() => updateDocument(doc.id, { notes: 'Edición posterior' })).toThrow(/no permite edición posterior/);
    expect(() => payOrder(doc.id, {
      factura: 'DTE-205', monto: doc.totalAmount, fechaPago: '2026-01-20'
    })).toThrow(/recibida por completo/);
    expect(loadDocuments()[0].status).toBe('Pagada');
  });
});

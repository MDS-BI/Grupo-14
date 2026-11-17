import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeSubtotalLinea, subtotalFromLineas, applyTotalesToCabecera, setActiveConfig
} from '../../src/module-config.js';
import {
  addEntity, addDocument, updateDocument, loadDocuments, validateDocument
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function seedEntity(){
  return addEntity({ name: 'Acme', code: 'AC-001' });
}

beforeEach(() => {
  store.clear();
  setActiveConfig({
    lineasDetalle: { unidadesMedida: ['unidades'], maxPorcentajeDescuento: 50 },
    tasaImpuesto: 0.16
  });
});

describe('detail line calculations', () => {
  it('computes a line subtotal with discount', () => {
    expect(computeSubtotalLinea({ cantidad: 2, precioUnitario: 100, porcentajeDescuentoLinea: 10 })).toBe(180);
    expect(computeSubtotalLinea({ cantidad: 3, precioUnitario: 20 })).toBe(60);
  });

  it('sums line subtotals into a document subtotal', () => {
    expect(subtotalFromLineas([
      { cantidad: 2, precioUnitario: 100 },
      { cantidad: 1, precioUnitario: 50, porcentajeDescuentoLinea: 100 }
    ])).toBe(200);
  });

  it('applies tax and total to the header', () => {
    const total = applyTotalesToCabecera({
      lineasDetalle: [{ cantidad: 2, precioUnitario: 100 }],
      discount: 50
    }, 0.16);
    expect(total.subtotal).toBe(200);
    expect(total.taxAmount).toBe(24);
    expect(total.totalAmount).toBe(174);
  });
});

describe('documents with detail lines', () => {
  it('persists lines and cascades totals on create', () => {
    const entity = seedEntity();
    const doc = addDocument({
      entityId: entity.entity_id,
      series: 'OC',
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      lineasDetalle: [
        { producto_id: 'P-1', descripcion: 'Monitor', cantidad: 2, unidadMedida: 'unidades', precioUnitario: 100, porcentajeDescuentoLinea: 10 },
        { producto_id: 'P-2', descripcion: 'Cable', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 50 }
      ]
    });
    expect(doc.lineasDetalle).toHaveLength(2);
    expect(doc.lineasDetalle.every(l => l.documento_id === doc.id)).toBe(true);
    expect(doc.subtotal).toBe(230);
    expect(doc.taxAmount).toBe(36.8);
    expect(doc.totalAmount).toBe(266.8);
    expect(loadDocuments()[0].lineasDetalle).toHaveLength(2);
  });

  it('recomputes totals when lines are updated', () => {
    const entity = seedEntity();
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      lineasDetalle: [{ producto_id: 'P-1', descripcion: 'Monitor', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 100 }]
    });
    const updated = updateDocument(doc.id, {
      lineasDetalle: [{ producto_id: 'P-1', descripcion: 'Monitor', cantidad: 3, unidadMedida: 'unidades', precioUnitario: 100 }]
    });
    expect(updated.subtotal).toBe(300);
    expect(updated.totalAmount).toBe(348);
  });

  it('rejects invalid quantities, prices and discounts', () => {
    const entity = seedEntity();
    const base = { entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' };
    expect(validateDocument({ ...base, lineasDetalle: [{ producto_id: 'P', descripcion: 'X', unidadMedida: 'u', cantidad: 0, precioUnitario: 10 }] }).valid).toBe(false);
    expect(validateDocument({ ...base, lineasDetalle: [{ producto_id: 'P', descripcion: 'X', unidadMedida: 'u', cantidad: 1, precioUnitario: -1 }] }).valid).toBe(false);
    expect(validateDocument({ ...base, lineasDetalle: [{ producto_id: 'P', descripcion: 'X', unidadMedida: 'u', cantidad: 1, precioUnitario: 10, porcentajeDescuentoLinea: 80 }] }).valid).toBe(false);
  });
});

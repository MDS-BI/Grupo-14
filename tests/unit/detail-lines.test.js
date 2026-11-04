import { describe, it, expect, beforeEach } from 'vitest';
import { computeSubtotalLinea, subtotalFromLineas, applyTotalesToCabecera, setActiveConfig, DEFAULT_TAX_RATE, normalizeConfig, userConfig } from '../../src/module-config.js';
import { validateLineasDetalle, addEntity, addDocument, updateDocument, loadDocuments } from '../../src/storage.js';
import { resetSession } from '../../src/auth.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  resetSession();
});

describe('line subtotal and header cascade', () => {
  it('computes the line subtotal with its percentage discount', () => {
    expect(computeSubtotalLinea({ cantidad: 2, precioUnitario: 100, porcentajeDescuentoLinea: 10 })).toBe(180);
    expect(computeSubtotalLinea({ cantidad: 3, precioUnitario: 33.333, porcentajeDescuentoLinea: 0 })).toBe(100);
    expect(computeSubtotalLinea({ cantidad: 'x', precioUnitario: 10 })).toBe(0);
  });

  it('sums line subtotals', () => {
    const lineas = [
      { cantidad: 2, precioUnitario: 100, porcentajeDescuentoLinea: 0 },
      { cantidad: 1, precioUnitario: 50, porcentajeDescuentoLinea: 20 }
    ];
    expect(subtotalFromLineas(lineas)).toBe(240);
  });

  it('applies the tax cascade after the global discount', () => {
    const cab = applyTotalesToCabecera({
      lineasDetalle: [{ cantidad: 2, precioUnitario: 100, porcentajeDescuentoLinea: 0 }],
      discount: 50
    }, DEFAULT_TAX_RATE);
    expect(cab.subtotal).toBe(200);
    expect(cab.taxAmount).toBe(24);
    expect(cab.totalAmount).toBe(174);
  });
});

describe('detail line validation', () => {
  it('requires product, description, quantity, unit and price', () => {
    const result = validateLineasDetalle([{}]);
    expect(result.valid).toBe(false);
    expect(result.errors['linea-0-producto_id']).toBeTruthy();
    expect(result.errors['linea-0-descripcion']).toBeTruthy();
    expect(result.errors['linea-0-cantidad']).toBeTruthy();
    expect(result.errors['linea-0-unidadMedida']).toBeTruthy();
    expect(result.errors['linea-0-precioUnitario']).toBeTruthy();
  });

  it('rejects zero quantity and discounts above the configured maximum', () => {
    const result = validateLineasDetalle([{
      producto_id: 'SKU-1',
      descripcion: 'Caja',
      cantidad: 0,
      unidadMedida: 'cajas',
      precioUnitario: 10,
      porcentajeDescuentoLinea: 150
    }]);
    expect(result.errors['linea-0-cantidad']).toBeTruthy();
    expect(result.errors['linea-0-porcentajeDescuentoLinea']).toBeTruthy();
  });

  it('requires at least one line', () => {
    expect(validateLineasDetalle([]).errors.lineas).toBeTruthy();
  });
});

describe('documents with detail lines', () => {
  const entity = () => addEntity({ name: 'Acme', code: 'AC-1' });

  it('persists lines with the document FK and recalculates header totals', () => {
    const e = entity();
    const doc = addDocument({
      entityId: e.entity_id,
      folio: 1001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      discount: 20,
      lineasDetalle: [
        { producto_id: 'A', descripcion: 'Uno', cantidad: 2, unidadMedida: 'unidades', precioUnitario: 100, porcentajeDescuentoLinea: 10 },
        { producto_id: 'B', descripcion: 'Dos', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 50 }
      ]
    });
    expect(doc.lineasDetalle).toHaveLength(2);
    expect(doc.lineasDetalle[0].documento_id).toBe(doc.id);
    expect(doc.lineasDetalle[0].subtotalLinea).toBe(180);
    expect(doc.subtotal).toBe(230);
    expect(doc.taxAmount).toBe(33.6);
    expect(doc.totalAmount).toBe(243.6);
    expect(loadDocuments()[0].lineasDetalle).toHaveLength(2);
  });

  it('recalculates totals when lines are updated', () => {
    const e = entity();
    const doc = addDocument({
      entityId: e.entity_id,
      folio: 1002,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      lineasDetalle: [{ producto_id: 'A', descripcion: 'Uno', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 100 }]
    });
    const updated = updateDocument(doc.id, {
      lineasDetalle: [{ producto_id: 'A', descripcion: 'Uno', cantidad: 3, unidadMedida: 'unidades', precioUnitario: 100 }]
    });
    expect(updated.subtotal).toBe(300);
    expect(updated.totalAmount).toBe(348);
  });

  it('keeps manually entered totals when no lines are present', () => {
    const e = entity();
    const doc = addDocument({
      entityId: e.entity_id,
      folio: 1003,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      subtotal: 1000,
      discount: 50,
      taxAmount: 152,
      totalAmount: 1102
    });
    expect(doc.subtotal).toBe(1000);
    expect(doc.totalAmount).toBe(1102);
  });

  it('activates lineasDetalle in the shipped profile', () => {
    const { config, errors } = normalizeConfig(userConfig);
    expect(errors).toEqual([]);
    expect(config.lineasDetalle.unidadesMedida.length).toBeGreaterThan(0);
    expect(config.lineasDetalle.maxPorcentajeDescuento).toBe(100);
  });
});

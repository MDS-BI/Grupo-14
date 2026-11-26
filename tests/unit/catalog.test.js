import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetSession } from '../../src/auth.js';
import {
  addCatalogItem, updateCatalogItem, validateCatalogItem, loadCatalog,
  findCatalogItem, duplicateCatalogRequests, auditForEntity
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const base = {
  code: 'SKU-1',
  producto_id: 'LAP-01',
  descripcion: 'Laptop 14 pulgadas',
  categoria: 'TI',
  unidadMedida: 'unidades',
  precioReferencia: 15000
};

beforeEach(() => {
  store.clear();
  resetSession();
});

afterEach(() => resetSession());

describe('T136 - validación del catálogo', () => {
  it('exige código, descripción, unidad de medida y precio', () => {
    const check = validateCatalogItem({});
    expect(check.valid).toBe(false);
    expect(check.errors.code).toMatch(/obligatorio/);
    expect(check.errors.descripcion).toMatch(/obligatoria/);
    expect(check.errors.unidadMedida).toMatch(/obligatoria/);
    expect(check.errors.precioReferencia).toMatch(/no negativo/);
  });

  it('acepta precio cero y rechaza precios negativos o no numéricos', () => {
    expect(validateCatalogItem({ ...base, precioReferencia: 0 }).valid).toBe(true);
    expect(validateCatalogItem({ ...base, precioReferencia: -1 }).errors.precioReferencia).toMatch(/no negativo/);
    expect(validateCatalogItem({ ...base, precioReferencia: 'abc' }).errors.precioReferencia).toMatch(/no negativo/);
  });

  it('normaliza el código y usa el producto por defecto', () => {
    const item = addCatalogItem({ ...base, producto_id: undefined, code: ' sku-9 ' });
    expect(item.code).toBe('SKU-9');
    expect(item.producto_id).toBe('SKU-9');
    expect(item.precioReferencia).toBe(15000);
    expect(loadCatalog()).toHaveLength(1);
  });
});

describe('T136 - código único', () => {
  it('rechaza códigos duplicados ignorando mayúsculas y permite conservar el propio', () => {
    const item = addCatalogItem(base);
    expect(validateCatalogItem({ ...base, code: 'sku-1' }).errors.code).toMatch(/registrado/);
    expect(validateCatalogItem({ ...base, code: 'sku-1' }, item.id).valid).toBe(true);
    expect(() => addCatalogItem({ ...base, code: 'sku-1' })).toThrow(/registrado/);

    const other = addCatalogItem({ ...base, code: 'SKU-2' });
    expect(() => updateCatalogItem(other.id, { ...base, code: 'sku-1', revision: other.revision })).toThrow(/registrado/);
  });
});

describe('T136 - autocompletado y duplicados', () => {
  it('busca por código o producto y excluye inactivos', () => {
    const item = addCatalogItem(base);
    expect(findCatalogItem('sku-1').id).toBe(item.id);
    expect(findCatalogItem('LAP-01').descripcion).toBe('Laptop 14 pulgadas');
    expect(findCatalogItem('')).toBeUndefined();

    updateCatalogItem(item.id, { active: false, revision: item.revision });
    expect(findCatalogItem('SKU-1')).toBeUndefined();
    expect(findCatalogItem('LAP-01')).toBeUndefined();
  });

  it('detecta productos repetidos en las líneas sin distinguir mayúsculas', () => {
    const lines = [
      { producto_id: 'SKU-1' },
      { producto_id: 'sku-1' },
      { producto_id: 'SKU-2' },
      { producto_id: '' }
    ];
    expect(duplicateCatalogRequests(lines)).toEqual(['SKU-1']);
    expect(duplicateCatalogRequests([{ producto_id: 'SKU-1' }, { producto_id: 'SKU-2' }])).toEqual([]);
  });

  it('registra la creación en la auditoría', () => {
    const item = addCatalogItem(base);
    expect(auditForEntity('catalogo', item.id).map(e => e.accion)).toEqual(['crear']);
  });
});

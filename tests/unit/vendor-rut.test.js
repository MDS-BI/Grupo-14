import { describe, it, expect, beforeEach } from 'vitest';
import {
  cleanRut, normalizeRut, formatRut, rutVerificador, validateRut, isValidRut
} from '../../src/rut.js';
import { setActiveConfig, userConfig } from '../../src/module-config.js';
import { resetSession } from '../../src/auth.js';
import {
  addEntity, validateEntity, activeEntities, setEntityActive,
  assertEntityCanDeactivate, addDocument, patchDocument, auditForEntity,
  addRequisition, approveRequisition, validateQuotation
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const proveedor = (overrides = {}) => ({
  name: 'Proveedor RUT',
  code: 'PV-RUT',
  taxId: '12.345.678-5',
  categoriaProveedor: 'Servicios',
  paymentTerms: '30 días',
  creditLimit: 50000,
  ...overrides
});

beforeEach(() => {
  store.clear();
  setActiveConfig(userConfig);
  resetSession();
});

describe('T109 - RUT chileno y maestro de proveedores', () => {
  it('normaliza el RUT quitando puntos, guion y espacios', () => {
    expect(cleanRut('  12.345.678-5  ')).toBe('123456785');
    expect(normalizeRut('12.345.678-5')).toBe('123456785');
    expect(cleanRut('96.854.120-K')).toBe('96854120K');
  });

  it('formatea con el patrón XX.XXX.XXX-X y conserva la K', () => {
    expect(formatRut('123456785')).toBe('12.345.678-5');
    expect(formatRut('96854120K')).toBe('96.854.120-K');
    expect(formatRut('7.890.123-4')).toBe('7.890.123-4');
  });

  it('calcula y valida el dígito verificador con módulo 11', () => {
    expect(rutVerificador('12345678')).toBe('5');
    expect(rutVerificador('96854120')).toBe('K');
    expect(rutVerificador('11111111')).toBe('1');
    expect(validateRut('12.345.678-5')).toBe(true);
    expect(isValidRut('96854120K')).toBe(true);
    expect(validateRut('12.345.678-9')).toBe(false);
    expect(validateRut('12345-6')).toBe(false);
  });

  it('rechaza un RUT inválido y uno duplicado todavía con otro formato', () => {
    const saved = addEntity(proveedor());
    expect(saved.taxId).toBe('12.345.678-5');

    const invalid = validateEntity(proveedor({ code: 'PV-2', taxId: '12.345.678-9' }));
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.taxId).toMatch(/no es válido/);

    const duplicate = validateEntity(proveedor({ name: 'Otro proveedor', code: 'PV-3', taxId: '12345678-5' }));
    expect(duplicate.valid).toBe(false);
    expect(duplicate.errors.taxId).toMatch(/ya está registrado/);

    const sameEntity = validateEntity(proveedor({ taxId: '123456785' }), saved.id);
    expect(sameEntity.valid).toBe(true);
  });

  it('desactiva un proveedor, lo excluye de activos y lo reactiva', () => {
    const entity = addEntity(proveedor());
    expect(activeEntities().map(e => e.id)).toContain(entity.id);

    setEntityActive(entity.id, false);
    const inactive = activeEntities();
    expect(inactive.map(e => e.id)).not.toContain(entity.id);
    expect(inactive).toHaveLength(0);
    expect(auditForEntity('proveedor', entity.id).at(-1).accion).toBe('desactivar');

    setEntityActive(entity.id, true);
    expect(activeEntities().map(e => e.id)).toContain(entity.id);
  });

  it('impide cotizar con un proveedor inactivo', () => {
    const entity = addEntity(proveedor());
    const requisition = addRequisition({
      department: 'TI',
      justification: 'Compra de servicios',
      lineasDetalle: [{ descripcion: 'Servicio', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 1000 }]
    });
    approveRequisition(requisition.id);
    setEntityActive(entity.id, false);

    const check = validateQuotation({
      requisitionId: requisition.id,
      entityId: entity.entity_id,
      lineas: [{ precioUnitario: 1000 }]
    });
    expect(check.valid).toBe(false);
    expect(check.errors.entityId).toMatch(/no está activo/);
  });

  it('bloquea la desactivación cuando hay una OC emitida o parcialmente recibida', () => {
    const entity = addEntity(proveedor({ taxId: '96.854.120-K', code: 'PV-K' }));
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 2001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      status: 'Emitida',
      tipoDocumento: 'Orden de Compra',
      fechaEmision: '2026-01-01',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 1, unidadMedida: 'cajas', precioUnitario: 1000 }
      ]
    });
    expect(() => assertEntityCanDeactivate(entity.id)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);
    expect(() => setEntityActive(entity.id, false)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);
    expect(activeEntities().map(e => e.id)).toContain(entity.id);

    patchDocument(doc.id, { status: 'Recibida parcialmente' });
    expect(() => assertEntityCanDeactivate(entity.id)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);
  });
});

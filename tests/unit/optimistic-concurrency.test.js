import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  assertFresh, loadEntities, addEntity, updateEntity, loadDocuments, addDocument,
  updateDocument, validateEntity, validateDocument, validateLineasDetalle, loadAuditEvents
} from '../../src/storage.js';
import { setActiveConfig, applyTotalesToCabecera } from '../../src/module-config.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

const entityPayload = { name: 'Acme', code: 'AC-001' };
const documentPayload = {
  folio: 1001,
  startDate: '2026-08-01',
  endDate: '2026-08-05',
  lineasDetalle: [
    { producto_id: 'P-1', descripcion: 'Línea uno', cantidad: 2, unidadMedida: 'unidades', precioUnitario: 100 }
  ]
};

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  vi.restoreAllMocks();
});

describe('FR-048 - control optimista con snapshot', () => {
  it('acepta la revisión vigente y rechaza un snapshot obsoleto con código de conflicto', () => {
    const snapshot = { id: 'e-1', revision: 2, updatedAt: '2026-08-01T10:00:00.000Z' };

    expect(() => assertFresh(snapshot, 2, 'proveedor')).not.toThrow();
    expect(() => assertFresh(snapshot, undefined, 'proveedor')).not.toThrow();

    let conflict;
    try {
      assertFresh(snapshot, 1, 'proveedor');
    } catch (error) {
      conflict = error;
    }
    expect(conflict).toBeDefined();
    expect(conflict.code).toBe('REVISION_CONFLICT');
    expect(conflict.current).toBe(snapshot);
    expect(conflict.message).toContain('cambió desde que lo abriste');
  });

  it('bloquea la escritura de un proveedor con revisión obsoleta sin sobrescribir el cambio previo', () => {
    const created = addEntity(entityPayload);
    const stale = loadEntities().find(e => e.id === created.id);

    const committed = updateEntity(created.id, { name: 'Acme Actualizado', revision: stale.revision });
    expect(committed.revision).toBe(stale.revision + 1);

    const setItem = vi.spyOn(globalThis.localStorage, 'setItem');
    const auditsBefore = loadAuditEvents().length;
    expect(() => updateEntity(created.id, { name: 'Escritura fantasma', revision: stale.revision }))
      .toThrow(/cambió desde que lo abriste/);
    expect(setItem).not.toHaveBeenCalled();
    expect(loadAuditEvents()).toHaveLength(auditsBefore);
    expect(loadEntities()[0].name).toBe('Acme Actualizado');
    expect(loadEntities()[0].revision).toBe(committed.revision);
  });

  it('impide la sobrescritura silenciosa entre dos snapshots y permite reintentar con la revisión vigente', () => {
    const created = addEntity(entityPayload);
    const snapshotA = loadEntities().find(e => e.id === created.id);
    const snapshotB = loadEntities().find(e => e.id === created.id);

    updateEntity(created.id, { name: 'Cambio A', revision: snapshotA.revision });
    expect(() => updateEntity(created.id, { name: 'Cambio B', revision: snapshotB.revision }))
      .toThrow(/cambió desde que lo abriste/);
    expect(loadEntities()[0].name).toBe('Cambio A');

    const fresh = loadEntities().find(e => e.id === created.id);
    const retried = updateEntity(created.id, { name: 'Cambio B', revision: fresh.revision });
    expect(retried.name).toBe('Cambio B');
    expect(retried.revision).toBe(fresh.revision + 1);
    expect(retried.updatedAt).not.toBe(fresh.updatedAt);
  });

  it('bloquea un documento con snapshot obsoleto, incluidas sus líneas de detalle', () => {
    const entity = addEntity(entityPayload);
    const created = addDocument({ ...documentPayload, entityId: entity.entity_id });
    const stale = loadDocuments().find(d => d.id === created.id);

    const committed = updateDocument(created.id, {
      folio: 1002,
      revision: stale.revision,
      lineasDetalle: [
        { producto_id: 'P-2', descripcion: 'Línea dos', cantidad: 3, unidadMedida: 'cajas', precioUnitario: 50 }
      ]
    });
    expect(committed.folio).toBe(1002);
    expect(committed.lineasDetalle).toHaveLength(1);

    const setItem = vi.spyOn(globalThis.localStorage, 'setItem');
    expect(() => updateDocument(created.id, {
      folio: 9999,
      revision: stale.revision,
      lineasDetalle: [
        { producto_id: 'P-3', descripcion: 'Línea fantasma', cantidad: 9, unidadMedida: 'cajas', precioUnitario: 1 }
      ]
    })).toThrow(/documento cambió desde que lo abriste/);
    expect(setItem).not.toHaveBeenCalled();

    const stored = loadDocuments()[0];
    expect(stored.folio).toBe(1002);
    expect(stored.lineasDetalle[0].producto_id).toBe('P-2');
    expect(stored.lineasDetalle).toHaveLength(1);

    const fresh = loadDocuments().find(d => d.id === created.id);
    const retried = updateDocument(created.id, { folio: 1003, revision: fresh.revision });
    expect(retried.folio).toBe(1003);
    expect(retried.revision).toBe(fresh.revision + 1);
  });
});

describe('fechas, rangos y campos obligatorios por campo', () => {
  it('devuelve un error independiente para cada campo obligatorio de la entidad', () => {
    const { valid, errors } = validateEntity({ name: '   ', code: '' });
    expect(valid).toBe(false);
    expect(errors.name).toContain('obligatorio');
    expect(errors.code).toContain('obligatorio');
    expect(errors.email).toBeUndefined();
    expect(errors.targetDate).toBeUndefined();

    const onlyName = validateEntity({ name: 'Acme', code: '' });
    expect(onlyName.errors.name).toBeUndefined();
    expect(onlyName.errors.code).toContain('obligatorio');
  });

  it('rechaza fechas de entidad inválidas sin afectar a los demás campos', () => {
    expect(validateEntity({ ...entityPayload, targetDate: '2026-02-30' }).errors.targetDate)
      .toContain('fecha válida');
    expect(validateEntity({ ...entityPayload, targetDate: '2026-13-45' }).errors.targetDate)
      .toContain('fecha válida');
    expect(validateEntity({ ...entityPayload, targetDate: '2026-08-01' }).valid).toBe(true);
    expect(validateEntity({ ...entityPayload, targetDate: '' }).valid).toBe(true);
  });

  it('separa los errores de correo, RUT y límite de crédito', () => {
    const { errors } = validateEntity({
      ...entityPayload,
      email: '.sin.arroba',
      taxId: '12.345.678-9',
      creditLimit: -1
    });
    expect(errors.email).toContain('correo electrónico');
    expect(errors.taxId).toContain('no es válido');
    expect(errors.creditLimit).toContain('no negativo');
    expect(errors.name).toBeUndefined();
  });

  it('devuelve un error por campo obligatorio del documento', () => {
    const entity = addEntity(entityPayload);
    const base = { entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' };
    const { valid, errors } = validateDocument({ entityId: '', folio: '', startDate: '', endDate: '' });

    expect(valid).toBe(false);
    expect(errors.entityId).toContain('Selecciona una entidad');
    expect(errors.folio).toContain('obligatorio');
    expect(errors.startDate).toContain('obligatoria');
    expect(errors.endDate).toContain('obligatoria');
    expect(validateDocument(base).valid).toBe(true);
  });

  it('rechaza fechas de documento inválidas y el rango invertido en el campo de fin', () => {
    const entity = addEntity(entityPayload);
    const base = { entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' };

    expect(validateDocument({ ...base, startDate: '2026-02-30' }).errors.startDate)
      .toContain('fecha válida');
    expect(validateDocument({ ...base, endDate: '2026-13-45' }).errors.endDate)
      .toContain('fecha válida');

    const inverted = validateDocument({ ...base, startDate: '2026-08-10', endDate: '2026-08-01' });
    expect(inverted.errors.startDate).toBeUndefined();
    expect(inverted.errors.endDate).toContain('igual o posterior');
    expect(validateDocument({ ...base, startDate: '2026-08-01', endDate: '2026-08-01' }).valid).toBe(true);
  });

  it('valida la fecha estimada de entrega contra el rango del documento', () => {
    const entity = addEntity(entityPayload);
    const base = { entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' };

    expect(validateDocument({ ...base, fechaEstimadaEntrega: '2026-02-30' }).errors.fechaEstimadaEntrega)
      .toContain('fecha válida');
    expect(validateDocument({ ...base, fechaEstimadaEntrega: '2026-07-31' }).errors.fechaEstimadaEntrega)
      .toContain('anterior a la fecha de inicio');
    expect(validateDocument({ ...base, fechaEstimadaEntrega: '2026-08-06' }).errors.fechaEstimadaEntrega)
      .toContain('posterior a la fecha de fin');
    expect(validateDocument({ ...base, fechaEstimadaEntrega: '2026-08-03' }).valid).toBe(true);
  });

  it('informa cada línea de detalle inválida en su propio campo', () => {
    const { valid, errors } = validateLineasDetalle([{
      producto_id: '',
      descripcion: '',
      cantidad: 0,
      unidadMedida: '',
      precioUnitario: -1,
      porcentajeDescuentoLinea: 120
    }]);

    expect(valid).toBe(false);
    expect(errors['linea-0-producto_id']).toContain('obligatorio');
    expect(errors['linea-0-descripcion']).toContain('obligatoria');
    expect(errors['linea-0-cantidad']).toContain('mayor que cero');
    expect(errors['linea-0-unidadMedida']).toContain('obligatoria');
    expect(errors['linea-0-precioUnitario']).toContain('no negativo');
    expect(errors['linea-0-porcentajeDescuentoLinea']).toContain('0 y 100');

    const fixed = validateLineasDetalle([{
      producto_id: 'P-1', descripcion: 'Ítem', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 10
    }]);
    expect(fixed.valid).toBe(true);
  });

  it('aplica campos obligatorios definidos por configuración a entidad y documento por separado', () => {
    setActiveConfig({
      customFields: [
        { target: 'entity', key: 'riesgo', label: 'Riesgo', type: 'number', required: true },
        { target: 'document', key: 'canal', label: 'Canal', type: 'select', options: ['web', 'tienda'], required: true }
      ]
    });
    const entity = addEntity({ ...entityPayload, riesgo: 5 });
    const base = { entityId: entity.entity_id, folio: 1, startDate: '2026-08-01', endDate: '2026-08-05' };

    const docCheck = validateDocument(base);
    expect(docCheck.errors.canal).toContain('obligatorio');
    expect(docCheck.errors.startDate).toBeUndefined();

    const entityCheck = validateEntity({ ...entityPayload, riesgo: '' });
    expect(entityCheck.errors.riesgo).toContain('obligatorio');
    expect(entityCheck.errors.code).toBeUndefined();

    expect(validateDocument({ ...base, canal: 'web' }).valid).toBe(true);
    expect(validateEntity({ ...entityPayload, riesgo: 5 }).valid).toBe(true);
  });

  it('usa la tasa imponible configurada al recalcular los totales desde líneas', () => {
    setActiveConfig({ taxRate: 0.16 });
    const cab = applyTotalesToCabecera({
      lineasDetalle: [{ cantidad: 1, precioUnitario: 100, subtotalLinea: 100 }],
      discount: 0
    }, 0.16);
    expect(cab.subtotal).toBe(100);
    expect(cab.taxAmount).toBe(16);
    expect(cab.totalAmount).toBe(116);
  });
});

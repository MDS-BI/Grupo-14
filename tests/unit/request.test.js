import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import {
  addEntity, addDocument, loadDocuments, validateDocument, PENDING_STATUS
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function base(entityId){
  return {
    entityId,
    folio: 1,
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    tipoDocumento: 'Solicitud de Cotización',
    departamento: 'Producción'
  };
}

beforeEach(() => {
  store.clear();
  setActiveConfig({
    customFields: [
      { target: 'document', key: 'tipoDocumento', label: 'Tipo', type: 'text' },
      { target: 'document', key: 'departamento', label: 'Departamento', type: 'text' }
    ],
    justificacion: { requiredFor: ['Solicitud de Cotización'] }
  });
});

describe('request justification', () => {
  it('blocks requests without justification', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const check = validateDocument({ ...base(entity.entity_id), status: PENDING_STATUS, justificacion: '' });
    expect(check.valid).toBe(false);
    expect(check.errors.justificacion).toMatch(/justificación/);
    expect(() => addDocument({ ...base(entity.entity_id), status: PENDING_STATUS, justificacion: '' })).toThrow(/justificación/);
  });

  it('persists the justification and pending status', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const doc = addDocument({
      ...base(entity.entity_id),
      status: PENDING_STATUS,
      justificacion: 'Insumos para el taller de producción'
    });
    expect(doc.status).toBe(PENDING_STATUS);
    expect(doc.justificacion).toBe('Insumos para el taller de producción');
    expect(loadDocuments()[0].justificacion).toBe('Insumos para el taller de producción');
  });
});

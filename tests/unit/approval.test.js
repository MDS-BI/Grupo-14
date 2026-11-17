import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import {
  addEntity, addDocument, loadDocuments, PENDING_STATUS
} from '../../src/storage.js';
import { validateApproval, approveRequest, rejectRequest } from '../../src/approval.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function configure(){
  setActiveConfig({
    customFields: [
      { target: 'entity', key: 'categoriaProveedor', label: 'Categoría', type: 'text' },
      { target: 'document', key: 'tipoDocumento', label: 'Tipo', type: 'text' },
      { target: 'document', key: 'departamento', label: 'Departamento', type: 'text' },
      { target: 'document', key: 'presupuestoDisponible', label: 'Presupuesto', type: 'number' }
    ],
    justificacion: { requiredFor: ['Solicitud de Cotización'] }
  });
}

function seedRequest(overrides = {}){
  const entity = addEntity({
    name: 'Acme',
    code: 'AC-001',
    taxId: 'RFC800101AB1',
    paymentTerms: 'neto 30',
    creditLimit: 10000,
    categoriaProveedor: 'Materias primas'
  });
  return {
    entity,
    doc: addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: PENDING_STATUS,
      tipoDocumento: 'Solicitud de Cotización',
      justificacion: 'Se requieren insumos para el taller',
      departamento: 'Producción',
      presupuestoDisponible: 5000,
      totalAmount: 4000,
      ...overrides
    })
  };
}

beforeEach(() => {
  store.clear();
  configure();
});

describe('approval service', () => {
  it('validates commercial data and credit limit', () => {
    const { doc } = seedRequest();
    expect(validateApproval(doc).valid).toBe(true);

    const lowCredit = { ...doc, totalAmount: 20000 };
    const check = validateApproval(lowCredit);
    expect(check.valid).toBe(false);
    expect(check.errors.creditLimit).toMatch(/límite de crédito/);
  });

  it('rejects approval when the request is not pending', () => {
    const { doc } = seedRequest();
    const check = validateApproval({ ...doc, status: 'borrador' });
    expect(check.valid).toBe(false);
    expect(check.errors.status).toMatch(/pendiente/);
  });

  it('approves a request and assigns the official OC folio', () => {
    const { doc } = seedRequest();
    const approved = approveRequest(doc.id, { userId: 'u1', comment: 'Autorizado' });
    expect(approved.status).toBe('aprobado');
    expect(approved.series).toBe('OC');
    expect(approved.folio).toBe(1);
    expect(loadDocuments()[0].aprobaciones[0].comment).toBe('Autorizado');
  });

  it('requires a motive to reject a request', () => {
    const { doc } = seedRequest();
    expect(() => rejectRequest(doc.id, { userId: 'u1', comment: '' })).toThrow(/motivo/);
    const rejected = rejectRequest(doc.id, { userId: 'u1', comment: 'Sin presupuesto' });
    expect(rejected.status).toBe('cancelado');
  });
});

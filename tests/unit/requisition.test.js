import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateRequisition, addRequisition, loadRequisitions, approveRequisition,
  rejectRequisition, pendingRequisitionsForDepartment, REQUISITION_STATUS, clearAll
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';
import { setSession, resetSession } from '../../src/auth.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const basePayload = () => ({
  department: 'TI',
  justification: 'Renovar equipos del área',
  lineasDetalle: [{ descripcion: 'Laptop', cantidad: 2, unidadMedida: 'unidades', precioEstimado: 15000 }]
});

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  resetSession();
});

describe('requisition validation', () => {
  it('requires department, justification and at least one line', () => {
    expect(validateRequisition({}).valid).toBe(false);
    expect(validateRequisition({}).errors.department).toContain('obligatorio');
    expect(validateRequisition({}).errors.justification).toContain('justificación');
    expect(validateRequisition({ department: 'TI', justification: 'x', lineasDetalle: [] }).errors.lineasDetalle).toBeTruthy();
  });

  it('rejects lines without description or with a non-positive quantity', () => {
    const result = validateRequisition({
      department: 'TI',
      justification: 'Motivo',
      lineasDetalle: [{ descripcion: '', cantidad: 0 }]
    });
    expect(result.errors['linea-0-descripcion']).toBeTruthy();
    expect(result.errors['linea-0-cantidad']).toBeTruthy();
  });

  it('accepts a complete requisition', () => {
    expect(validateRequisition(basePayload()).valid).toBe(true);
  });
});

describe('requisition storage', () => {
  it('stores new requisitions as pending approval', () => {
    setSession({ id: 'u1', username: 'sol', name: 'Sol', role: 'solicitante', active: true });
    const requisition = addRequisition(basePayload());
    expect(requisition.status).toBe(REQUISITION_STATUS.PENDING);
    expect(requisition.requesterId).toBe('u1');
    expect(requisition.requesterName).toBe('Sol');
    expect(requisition.folio).toContain('SOL-');
    expect(loadRequisitions()).toHaveLength(1);
  });

  it('keeps the justification intact for the approver detail', () => {
    const requisition = addRequisition({ ...basePayload(), justification: '  Urge por auditoría externa  ' });
    expect(loadRequisitions()[0].justification).toBe('Urge por auditoría externa');
    expect(requisition.justification).toBe('Urge por auditoría externa');
  });

  it('approves a pending requisition', () => {
    const requisition = addRequisition(basePayload());
    const approved = approveRequisition(requisition.id);
    expect(approved.status).toBe(REQUISITION_STATUS.APPROVED);
    expect(approved.approvedAt).toBeTruthy();
    expect(() => approveRequisition(requisition.id)).toThrow(/pendientes/);
  });

  it('rejects a pending requisition only with a reason', () => {
    const requisition = addRequisition(basePayload());
    expect(() => rejectRequisition(requisition.id, '')).toThrow(/motivo/);
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.PENDING);
    const rejected = rejectRequisition(requisition.id, 'Sin presupuesto');
    expect(rejected.status).toBe(REQUISITION_STATUS.REJECTED);
    expect(rejected.rejectionReason).toBe('Sin presupuesto');
  });

  it('filters pending requisitions by department', () => {
    addRequisition(basePayload());
    addRequisition({ ...basePayload(), department: 'Compras' });
    expect(pendingRequisitionsForDepartment('TI')).toHaveLength(1);
    expect(pendingRequisitionsForDepartment('Compras')).toHaveLength(1);
    expect(pendingRequisitionsForDepartment()).toHaveLength(2);
  });

  it('clears requisitions', () => {
    addRequisition(basePayload());
    clearAll();
    expect(loadRequisitions()).toEqual([]);
  });
});

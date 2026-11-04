import { describe, it, expect, beforeEach } from 'vitest';
import {
  addRequisition, loadRequisitions, approveRequisition, rejectRequisition,
  pendingRequisitionsForDepartment, budgetForDepartment, requisitionTotal,
  DEPARTMENT_BUDGETS, REQUISITION_STATUS
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';
import { resetSession } from '../../src/auth.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const payload = (department = 'TI', cantidad = 1, precio = 1000) => ({
  department,
  justification: `Compra para ${department}`,
  lineasDetalle: [{ descripcion: 'Artículo', cantidad, unidadMedida: 'unidades', precioEstimado: precio }]
});

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  resetSession();
});

describe('department approval inbox', () => {
  it('only lists pending requisitions of the requested department', () => {
    addRequisition(payload('TI'));
    addRequisition(payload('Compras'));
    const ti = pendingRequisitionsForDepartment('TI');
    expect(ti).toHaveLength(1);
    expect(ti[0].department).toBe('TI');
  });

  it('removes approved and rejected requisitions from the pending inbox', () => {
    const first = addRequisition(payload('TI'));
    const second = addRequisition(payload('TI'));
    approveRequisition(first.id);
    rejectRequisition(second.id, 'Duplicada');
    expect(pendingRequisitionsForDepartment('TI')).toHaveLength(0);
  });

  it('computes the department budget usage and available balance', () => {
    const total = DEPARTMENT_BUDGETS.TI;
    const requisition = addRequisition(payload('TI', 2, 1000));
    const budget = budgetForDepartment('TI');
    expect(requisitionTotal(requisition)).toBe(2000);
    expect(budget.total).toBe(total);
    expect(budget.used).toBe(2000);
    expect(budget.available).toBe(total - 2000);
  });

  it('counts approved requisitions against the budget but not rejected ones', () => {
    const approved = addRequisition(payload('TI', 1, 5000));
    const rejected = addRequisition(payload('TI', 1, 5000));
    approveRequisition(approved.id);
    rejectRequisition(rejected.id, 'Sin justificación suficiente');
    expect(budgetForDepartment('TI').used).toBe(5000);
  });

  it('does not allow approving or rejecting a non-pending requisition', () => {
    const requisition = addRequisition(payload('TI'));
    approveRequisition(requisition.id);
    expect(() => rejectRequisition(requisition.id, 'Tarde')).toThrow(/pendientes/);
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.APPROVED);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import { resetSession, setSession } from '../../src/auth.js';
import {
  setDepartmentBudget, addRequisition, approveRequisition, rejectRequisition,
  decideApproval, budgetForDepartment, isOverBudget, auditForEntity,
  loadRequisitions, REQUISITION_STATUS
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const request = (department, amount) => ({
  department,
  justification: `Compra para ${department}`,
  lineasDetalle: [
    { descripcion: 'Material', cantidad: 1, unidadMedida: 'unidades', precioEstimado: amount }
  ]
});

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  resetSession();
});

describe('T114 - presupuesto por departamento', () => {
  it('calcula asignado, comprometido y disponible, y libera al rechazar o cancelar', () => {
    setDepartmentBudget('Operaciones', 100000, 'Presupuesto anual');
    expect(budgetForDepartment('Operaciones')).toMatchObject({
      total: 100000, used: 0, committed: 0, available: 100000, overBudget: false
    });

    const approved = addRequisition(request('Operaciones', 4000));
    const rejected = addRequisition(request('Operaciones', 1000));
    const cancelled = addRequisition(request('Operaciones', 500));
    expect(budgetForDepartment('Operaciones')).toMatchObject({
      total: 100000, used: 5500, committed: 5500, available: 94500
    });

    approveRequisition(approved.id);
    expect(budgetForDepartment('Operaciones').committed).toBe(5500);

    rejectRequisition(rejected.id, 'Fuera de presupuesto');
    expect(budgetForDepartment('Operaciones')).toMatchObject({ used: 4500, available: 95500 });

    decideApproval(cancelled.id, REQUISITION_STATUS.REJECTED, { userId: 'u-admin', comment: 'Cancelada' });
    expect(budgetForDepartment('Operaciones')).toMatchObject({ used: 4000, available: 96000 });
    expect(budgetForDepartment('Operaciones').total).toBe(100000);
  });

  it('ajusta el presupuesto con auditoría', () => {
    const budget = setDepartmentBudget('TI', 8000, 'Reajuste de mitad de año');
    expect(budget.total).toBe(8000);
    const audit = auditForEntity('presupuesto', 'TI').at(-1);
    expect(audit.accion).toBe('ajustar');
    expect(audit.motivo).toBe('Reajuste de mitad de año');
  });

  it('alerta el sobregiro y bloquea la autorización sin override', () => {
    setDepartmentBudget('Compras', 1000, 'Presupuesto ajustado');
    const requisition = addRequisition(request('Compras', 1500));
    const budget = budgetForDepartment('Compras');
    expect(budget).toMatchObject({ total: 1000, used: 1500, committed: 1500, available: 0, overBudget: true });
    expect(isOverBudget('Compras')).toBe(true);

    setSession({
      id: 'u-apr', username: 'apr', name: 'Ariel', role: 'aprobador',
      department: 'Compras', active: true
    });
    expect(() => approveRequisition(requisition.id)).toThrow(/override administrativo/);
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.PENDING);
  });

  it('permite el override administrativo sólo con motivo auditado', () => {
    setDepartmentBudget('Compras', 1000, 'Presupuesto ajustado');
    const requisition = addRequisition(request('Compras', 1500));
    expect(() => approveRequisition(requisition.id)).toThrow(/motivo/);

    const reason = 'Autorización extraordinaria de dirección';
    const approved = approveRequisition(requisition.id, { overrideReason: reason });
    expect(approved.status).toBe(REQUISITION_STATUS.APPROVED);
    expect(approved.budgetOverride).toBe(reason);

    const event = auditForEntity('solicitud', requisition.id).find(e => e.accion === 'aprobar_con_override');
    expect(event).toBeDefined();
    expect(event.motivo).toBe(reason);
    expect(event.rol).toBe('Administrador');
  });
});

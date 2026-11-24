// T039: la bandeja y las acciones de aprobación quedan restringidas al rol
// aprobador y a su departamento; el administrador ve todos los departamentos.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  addRequisition, approveRequisition, rejectRequisition, loadRequisitions,
  pendingRequisitionsForApprover, REQUISITION_STATUS
} from '../../src/storage.js';
import { setSession, resetSession, getSession } from '../../src/auth.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const APPROVER_TI = { id: 'apr-ti', username: 'apr.ti', name: 'Aprobador TI', role: 'aprobador', department: 'TI', active: true };
const APPROVER_OPS = { id: 'apr-ops', username: 'apr.ops', name: 'Aprobador Operaciones', role: 'aprobador', department: 'Operaciones', active: true };
const APPROVER_NO_DEPT = { id: 'apr-x', username: 'apr.x', name: 'Aprobador sin área', role: 'aprobador', department: '', active: true };
const REQUESTER = { id: 'sol', username: 'sol', name: 'Solicitante', role: 'solicitante', department: 'TI', active: true };

function requisition(department){
  return addRequisition({
    department,
    justification: `Compra para ${department}`,
    lineasDetalle: [{ descripcion: 'Artículo', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 100 }]
  });
}

let ti;
let ops;

beforeEach(() => {
  store.clear();
  resetSession();
  ti = requisition('TI');
  ops = requisition('Operaciones');
});

afterEach(() => resetSession());

describe('sesión del aprobador', () => {
  it('conserva el departamento del usuario en la sesión', () => {
    setSession(APPROVER_TI);
    expect(getSession().department).toBe('TI');
  });
});

describe('listado de la bandeja (T039)', () => {
  it('el aprobador solo ve las solicitudes pendientes de su departamento', () => {
    setSession(APPROVER_TI);
    expect(pendingRequisitionsForApprover().map(r => r.id)).toEqual([ti.id]);
    setSession(APPROVER_OPS);
    expect(pendingRequisitionsForApprover().map(r => r.id)).toEqual([ops.id]);
  });

  it('un aprobador sin departamento no ve ninguna solicitud', () => {
    setSession(APPROVER_NO_DEPT);
    expect(pendingRequisitionsForApprover()).toEqual([]);
  });

  it('un rol sin permiso de aprobación no ve ninguna solicitud', () => {
    setSession(REQUESTER);
    expect(pendingRequisitionsForApprover()).toEqual([]);
  });

  it('el administrador ve las solicitudes de todos los departamentos', () => {
    resetSession();
    expect(pendingRequisitionsForApprover().map(r => r.id).sort()).toEqual([ti.id, ops.id].sort());
  });
});

describe('acciones de aprobar/rechazar (T039, validadas en storage)', () => {
  it('impide aprobar una solicitud de otro departamento', () => {
    setSession(APPROVER_TI);
    expect(() => approveRequisition(ops.id)).toThrow(/departamento/i);
    expect(loadRequisitions().find(r => r.id === ops.id).status).toBe(REQUISITION_STATUS.PENDING);
  });

  it('impide rechazar una solicitud de otro departamento', () => {
    setSession(APPROVER_TI);
    expect(() => rejectRequisition(ops.id, 'Sin fondos')).toThrow(/departamento/i);
    expect(loadRequisitions().find(r => r.id === ops.id).status).toBe(REQUISITION_STATUS.PENDING);
  });

  it('permite aprobar y rechazar solicitudes del propio departamento', () => {
    const second = requisition('TI');
    setSession(APPROVER_TI);
    expect(approveRequisition(ti.id).status).toBe(REQUISITION_STATUS.APPROVED);
    expect(rejectRequisition(second.id, 'Duplicada').status).toBe(REQUISITION_STATUS.REJECTED);
  });

  it('un aprobador sin departamento no puede aprobar ni rechazar', () => {
    setSession(APPROVER_NO_DEPT);
    expect(() => approveRequisition(ti.id)).toThrow(/departamento/i);
    expect(() => rejectRequisition(ti.id, 'Motivo')).toThrow(/departamento/i);
  });

  it('un rol sin permiso de aprobación no puede aprobar ni rechazar', () => {
    setSession(REQUESTER);
    expect(() => approveRequisition(ti.id)).toThrow(/rol/i);
    expect(() => rejectRequisition(ti.id, 'Motivo')).toThrow(/rol/i);
    expect(loadRequisitions().find(r => r.id === ti.id).status).toBe(REQUISITION_STATUS.PENDING);
  });

  it('el administrador puede aprobar solicitudes de cualquier departamento', () => {
    resetSession();
    expect(approveRequisition(ops.id).status).toBe(REQUISITION_STATUS.APPROVED);
  });
});

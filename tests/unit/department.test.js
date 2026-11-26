import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetSession } from '../../src/auth.js';
import {
  addUser, addDepartment, updateDepartment, validateDepartment, loadDepartments,
  departmentOptions, approverForDepartment, assertDepartmentCanDeactivate,
  addRequisition, saveBudgets, auditForEntity
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  resetSession();
});

afterEach(() => resetSession());

describe('T133 - alta de departamentos con código único', () => {
  it('normaliza el código y lo guarda en mayúsculas', () => {
    const department = addDepartment({ name: ' Compras ', code: ' com ' });
    expect(department.code).toBe('COM');
    expect(department.name).toBe('Compras');
    expect(department.active).toBe(true);
    expect(department.revision).toBe(1);
    expect(loadDepartments()).toHaveLength(1);
  });

  it('exige nombre y código', () => {
    const check = validateDepartment({ name: '', code: '' });
    expect(check.valid).toBe(false);
    expect(check.errors.name).toMatch(/obligatorio/);
    expect(check.errors.code).toMatch(/obligatorio/);
  });

  it('rechaza códigos duplicados ignorando mayúsculas y permite conservar el propio', () => {
    const first = addDepartment({ name: 'Compras', code: 'com' });
    const duplicate = validateDepartment({ name: 'Otra área', code: 'COM' });
    expect(duplicate.valid).toBe(false);
    expect(duplicate.errors.code).toMatch(/registrado/);
    expect(validateDepartment({ name: 'Compras', code: 'com' }, first.id).valid).toBe(true);
    expect(() => addDepartment({ name: 'Otra área', code: 'com' })).toThrow(/registrado/);
  });

  it('respeta la revisión al actualizar', () => {
    const department = addDepartment({ name: 'TI', code: 'TI' });
    expect(() => updateDepartment(department.id, { name: 'Soporte', revision: 99 })).toThrow();
    const updated = updateDepartment(department.id, { name: 'Soporte', revision: department.revision });
    expect(updated.name).toBe('Soporte');
    expect(updated.revision).toBe(2);
  });
});

describe('T133 - jefe aprobador', () => {
  it('acepta solo jefes activos y los expone en las opciones', () => {
    const active = addUser({ username: 'jefa', name: 'Jefa', role: 'aprobador', department: 'Compras' });
    const inactive = addUser({ username: 'ex', name: 'Ex', role: 'aprobador', department: 'Compras', active: false });
    expect(validateDepartment({ name: 'Compras', code: 'COM', approverId: inactive.id }).errors.approverId).toMatch(/activo/);
    expect(validateDepartment({ name: 'Compras', code: 'COM', approverId: 'inexistente' }).errors.approverId).toMatch(/activo/);

    const department = addDepartment({ name: 'Compras', code: 'COM', approverId: active.id });
    expect(approverForDepartment('Compras')).toBe(active.id);
    expect(approverForDepartment('Inexistente')).toBeUndefined();
    expect(departmentOptions()).toEqual([{ value: 'Compras', label: 'Compras', approverId: active.id }]);
  });
});

describe('T133 - guard de desactivación', () => {
  it('bloquea la desactivación con usuarios activos asignados', () => {
    const department = addDepartment({ name: 'TI', code: 'TI' });
    addUser({ username: 'ana', name: 'Ana', role: 'solicitante', department: 'TI' });
    expect(() => assertDepartmentCanDeactivate(department.id)).toThrow(/usuarios activos/);
    expect(() => updateDepartment(department.id, { active: false, revision: department.revision })).toThrow(/usuarios activos/);
    expect(loadDepartments()[0].active).toBe(true);
  });

  it('bloquea la desactivación con solicitudes en curso', () => {
    const department = addDepartment({ name: 'General', code: 'GEN' });
    addRequisition({
      department: 'General',
      justification: 'Materiales en curso',
      lineasDetalle: [{ descripcion: 'Material', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 100 }]
    });
    expect(() => assertDepartmentCanDeactivate(department.id)).toThrow(/solicitudes en curso/);
  });

  it('bloquea la desactivación con presupuesto comprometido', () => {
    const department = addDepartment({ name: 'Operaciones', code: 'OPS' });
    saveBudgets([{ department: 'Operaciones', total: 100000, committed: 250, revision: 1 }]);
    expect(() => assertDepartmentCanDeactivate(department.id)).toThrow(/presupuesto comprometido/);
  });

  it('desactiva sin bloqueos, lo oculta de las opciones y lo audita', () => {
    const department = addDepartment({ name: 'Compras', code: 'COM' });
    expect(() => assertDepartmentCanDeactivate(department.id)).not.toThrow();
    const updated = updateDepartment(department.id, { active: false, revision: department.revision });
    expect(updated.active).toBe(false);
    expect(updated.revision).toBe(2);
    expect(departmentOptions()).toEqual([]);
    expect(auditForEntity('departamento', department.id).map(e => e.accion)).toEqual(['crear', 'desactivar']);
  });
});

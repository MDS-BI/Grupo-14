import { describe, it, expect, beforeEach } from 'vitest';
import { ROLES, ROLE_KEYS, PERMISSIONS, can, setSession, resetSession, currentUser } from '../../src/auth.js';
import {
  validateUser, addUser, updateUser, deactivateUser, loadUsers,
  addEntity, addDocument, addRequisition, clearAll
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';
import { ROLE_FIXTURES } from '../setup/roles.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  setActiveConfig(null);
  resetSession();
});

describe('roles and permissions', () => {
  it('declares the five required roles', () => {
    expect(ROLE_KEYS).toEqual(['administrador', 'solicitante', 'aprobador', 'encargado_compras', 'encargado_recepcion']);
    for(const key of ROLE_KEYS){
      expect(ROLES[key].label).toBeTruthy();
    }
  });

  it('grants and denies permissions according to the active session', () => {
    setSession(ROLE_FIXTURES.solicitante);
    expect(can(PERMISSIONS.REQUISITIONS_CREATE)).toBe(true);
    expect(can(PERMISSIONS.REQUISITIONS_APPROVE)).toBe(false);
    expect(can(PERMISSIONS.RECEPTIONS_MANAGE)).toBe(false);

    setSession(ROLE_FIXTURES.aprobador);
    expect(can(PERMISSIONS.REQUISITIONS_APPROVE)).toBe(true);
    expect(can(PERMISSIONS.REQUISITIONS_CREATE)).toBe(false);

    setSession(ROLE_FIXTURES.recepcion);
    expect(can(PERMISSIONS.RECEPTIONS_MANAGE)).toBe(true);

    resetSession();
    expect(currentUser().role).toBe('administrador');
    expect(can(PERMISSIONS.USERS_MANAGE)).toBe(true);
  });

  it('denies all permissions for an inactive user', () => {
    setSession({ ...ROLE_FIXTURES.admin, active: false });
    expect(can(PERMISSIONS.USERS_MANAGE)).toBe(false);
  });
});

describe('user management', () => {
  it('validates username, name, role and duplicates', () => {
    expect(validateUser({ username: '', name: '', role: '' }).valid).toBe(false);
    expect(validateUser({ username: 'ana', name: 'Ana', role: 'inventor' }).errors.role).toContain('rol');
    const user = addUser({ username: 'ana', name: 'Ana', role: 'solicitante' });
    expect(user.id).toBeTruthy();
    expect(validateUser({ username: 'ANA', name: 'Otra', role: 'solicitante' }).errors.username).toContain('existe');
    expect(validateUser({ username: 'ANA', name: 'Otra', role: 'solicitante' }, user.id).valid).toBe(true);
  });

  it('creates and updates users', () => {
    const user = addUser({ username: 'ana', name: 'Ana', role: 'solicitante' });
    const updated = updateUser(user.id, { role: 'aprobador', name: 'Ana Pérez' });
    expect(updated.role).toBe('aprobador');
    expect(updated.name).toBe('Ana Pérez');
    expect(loadUsers()[0].role).toBe('aprobador');
  });

  it('blocks deactivation when the user has pending requisitions', () => {
    const user = addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    setSession(user);
    addRequisition({
      department: 'TI',
      justification: 'Equipos para el equipo',
      lineasDetalle: [{ descripcion: 'Laptop', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 15000 }]
    });
    expect(() => deactivateUser(user.id)).toThrow(/pendientes/);
  });

  it('blocks deactivation when the user owns an open order', () => {
    const user = addUser({ username: 'com', name: 'Com', role: 'encargado_compras' });
    const entity = addEntity({ name: 'Acme', code: 'AC-1' });
    setSession(user);
    addDocument({
      entityId: entity.entity_id,
      folio: 1001,
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      status: 'borrador'
    });
    expect(() => deactivateUser(user.id)).toThrow(/pendientes/);
  });

  it('deactivates users without pending work', () => {
    const user = addUser({ username: 'libre', name: 'Libre', role: 'solicitante' });
    const result = deactivateUser(user.id);
    expect(result.active).toBe(false);
    expect(loadUsers()[0].active).toBe(false);
  });
});

describe('clearAll', () => {
  it('removes users, requisitions and receptions as well', () => {
    addUser({ username: 'x', name: 'X', role: 'solicitante' });
    addRequisition({ department: 'TI', justification: 'Motivo', lineasDetalle: [{ descripcion: 'A', cantidad: 1 }] });
    clearAll();
    expect(loadUsers()).toEqual([]);
  });
});

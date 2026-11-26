import { describe, it, expect, beforeEach } from 'vitest';
import {
  ROLES, ROLE_KEYS, PERMISSIONS, can, setSession, resetSession, currentUser,
  login, logout, getSession, permissionsFor, roleLabel, isAdmin
} from '../../src/auth.js';
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
      status: 'Aprobada'
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

describe('T130 - login y logout', () => {
  it('inicia sesión con el usuario registrado sin distinguir mayúsculas', () => {
    const user = addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    const session = login(' SOL ', 'clave', loadUsers());
    expect(session.id).toBe(user.id);
    expect(session.username).toBe('sol');
    expect(getSession().id).toBe(user.id);
    expect(roleLabel('solicitante')).toBe('Solicitante');
    expect(can(PERMISSIONS.REQUISITIONS_CREATE)).toBe(true);
  });

  it('rechaza credenciales inválidas y campos vacíos', () => {
    addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    expect(() => login('otro', 'clave', loadUsers())).toThrow('Credenciales inválidas');
    expect(() => login('', 'clave', loadUsers())).toThrow(/obligatorios/);
    expect(() => login('sol', '   ', loadUsers())).toThrow(/obligatorios/);
  });

  it('rechaza un usuario desactivado', () => {
    addUser({ username: 'baja', name: 'Baja', role: 'aprobador', active: false });
    expect(() => login('baja', 'clave', loadUsers())).toThrow('El usuario está desactivado');
    expect(getSession().role).toBe('administrador');
  });

  it('cierra la sesión y revoca todos los permisos', () => {
    setSession(ROLE_FIXTURES.admin);
    expect(isAdmin()).toBe(true);
    logout();
    expect(getSession()).toBeNull();
    expect(currentUser()).toBeNull();
    expect(isAdmin()).toBe(false);
    expect(can(PERMISSIONS.DASHBOARD_VIEW)).toBe(false);
    expect(can(PERMISSIONS.USERS_MANAGE)).toBe(false);
  });

  it('conserva el departamento de la sesión y respeta el estado inactivo', () => {
    setSession({ ...ROLE_FIXTURES.aprobador, department: ' TI ', active: false });
    expect(currentUser().department).toBe('TI');
    expect(permissionsFor('aprobador')).toContain(PERMISSIONS.REQUISITIONS_APPROVE);
    expect(can(PERMISSIONS.REQUISITIONS_APPROVE)).toBe(false);
  });
});

describe('T130 - segregación de funciones', () => {
  it.each([
    ['solicitante', PERMISSIONS.REQUISITIONS_CREATE, PERMISSIONS.ORDERS_APPROVE],
    ['aprobador', PERMISSIONS.REQUISITIONS_APPROVE, PERMISSIONS.REQUISITIONS_CREATE],
    ['encargado_compras', PERMISSIONS.ORDERS_CREATE, PERMISSIONS.USERS_MANAGE],
    ['encargado_recepcion', PERMISSIONS.RECEPTIONS_MANAGE, PERMISSIONS.DOCUMENTS_MANAGE]
  ])('el rol %s solo ejecuta sus acciones permitidas', (role, allowed, denied) => {
    setSession(ROLE_FIXTURES[role === 'encargado_compras' ? 'compras' : role === 'encargado_recepcion' ? 'recepcion' : role]);
    expect(can(allowed)).toBe(true);
    expect(can(denied)).toBe(false);
  });

  it('no permite administrar usuarios a los roles operativos', () => {
    for(const key of ['solicitante', 'aprobador', 'compras', 'recepcion']){
      setSession(ROLE_FIXTURES[key]);
      expect(can(PERMISSIONS.USERS_MANAGE)).toBe(false);
    }
  });
});

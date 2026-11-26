import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadUsers } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 1 - users and permissions', () => {
  it('creates a user with a role from the administration panel', () => {
    qs('nav-users').click();
    expect(qs('view-users').hidden).toBe(false);
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana López';
    qs('user-role').value = 'solicitante';
    qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadUsers()).toHaveLength(1);
    expect(loadUsers()[0].role).toBe('solicitante');
    expect(qs('users-list').textContent).toContain('Ana López');
  });

  it('rejects duplicated users with an explanation', () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana';
    qs('user-role').value = 'solicitante';
    qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    qs('user-username').value = 'ana';
    qs('user-name').value = 'Otra';
    qs('user-role').value = 'encargado_compras';
    qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadUsers()).toHaveLength(1);
    expect(qs('error-user-username').textContent).toMatch(/existe/);
  });

  it('restricts administration navigation to non-admin roles', async () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana';
    qs('user-role').value = 'solicitante';
    qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const user = loadUsers()[0];

    const { setSession, can } = await import('../../src/auth.js');
    setSession(user);
    expect(can('users.manage')).toBe(false);
    expect(can('requisitions.create')).toBe(true);

    qs('nav-users').click();
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('view-users').hidden).toBe(true);
  });

  it('escapes user supplied content in the list', () => {
    qs('nav-users').click();
    qs('user-username').value = 'xss';
    qs('user-name').value = '<img src=x onerror="alert(1)">';
    qs('user-role').value = 'encargado_compras';
    qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const list = qs('users-list');
    expect(list.querySelector('img')).toBeNull();
    expect(list.textContent).toContain('<img');
  });
});

describe('T130 - sesión, enlaces profundos y segregación en la interfaz', () => {
  async function sessionApi(){
    return import('../../src/auth.js');
  }

  async function appApi(){
    return import('../../src/app.js');
  }

  async function storageApi(){
    return import('../../src/storage.js');
  }

  function tick(){
    return new Promise(resolve => dom.window.setTimeout(resolve, 0));
  }

  it('no abre una vista protegida desde un enlace profundo sin sesión', async () => {
    const { logout, resetSession } = await sessionApi();
    try{
      logout();
      dom.window.location.hash = '#/users';
      qs('nav-users').click();
      expect(qs('view-users').hidden).toBe(true);
      expect(qs('view-dashboard').hidden).toBe(false);
    }finally{
      resetSession();
    }
  });

  it('no restaura la sesión anterior tras una recarga sin persistencia', async () => {
    const { applySession } = await appApi();
    const { loadUsers } = await storageApi();
    const { logout, resetSession } = await sessionApi();
    try{
      qs('nav-users').click();
      qs('user-username').value = 'sol';
      qs('user-name').value = 'Sol';
      qs('user-role').value = 'solicitante';
      qs('user-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
      applySession(loadUsers()[0]);
      logout();

      vi.resetModules();
      const reloadedAuth = await import('../../src/auth.js');
      const reloadedApp = await import('../../src/app.js');
      await reloadedApp.boot();
      expect(reloadedAuth.getSession().id).toBe('system-admin');
      expect(qs('session-user').value).toBe('system-admin');
      expect(qs('view-dashboard').hidden).toBe(false);
    }finally{
      resetSession();
    }
  });

  it('no revela vistas protegidas al volver atrás sin sesión', async () => {
    const { logout, resetSession } = await sessionApi();
    try{
      logout();
      dom.window.history.pushState({}, '', '#/requisitions');
      qs('nav-requisitions').click();
      expect(qs('view-requisitions').hidden).toBe(true);
      dom.window.history.back();
      await tick();
      expect(qs('view-requisitions').hidden).toBe(true);
      expect(qs('view-dashboard').hidden).toBe(false);
    }finally{
      resetSession();
    }
  });

  it('valida credenciales y bloquea el acceso de un usuario desactivado', async () => {
    const { addUser } = await storageApi();
    const { login, resetSession, can, PERMISSIONS } = await sessionApi();
    try{
      const active = addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
      const inactive = addUser({ username: 'baja', name: 'Baja', role: 'aprobador', active: false });
      expect(login('SOL', 'clave', loadUsers()).id).toBe(active.id);
      expect(() => login('no-existe', 'clave', loadUsers())).toThrow(/Credenciales inválidas/);
      expect(() => login('baja', 'clave', loadUsers())).toThrow(/desactivado/);

      const { applySession } = await appApi();
      applySession(inactive);
      expect(can(PERMISSIONS.REQUISITIONS_APPROVE)).toBe(false);
      expect(qs('nav-approvals').hidden).toBe(true);
      expect(qs('nav-dashboard').hidden).toBe(true);
      expect(qs('view-dashboard').hidden).toBe(false);
    }finally{
      resetSession();
    }
  });

  it('segrega la navegación según el rol activo', async () => {
    const { addUser } = await storageApi();
    const { applySession } = await appApi();
    const { resetSession } = await sessionApi();
    try{
      const requester = addUser({ username: 'req', name: 'Requeridor', role: 'solicitante' });
      const receptionist = addUser({ username: 'rec', name: 'Recepcionista', role: 'encargado_recepcion' });
      const approver = addUser({ username: 'apr', name: 'Aprobador', role: 'aprobador' });

      applySession(requester);
      expect(qs('nav-requisitions').hidden).toBe(false);
      expect(qs('nav-approvals').hidden).toBe(true);
      expect(qs('nav-receptions').hidden).toBe(true);
      expect(qs('nav-users').hidden).toBe(true);

      applySession(receptionist);
      expect(qs('nav-receptions').hidden).toBe(false);
      expect(qs('nav-requisitions').hidden).toBe(true);

      applySession(approver);
      expect(qs('nav-approvals').hidden).toBe(false);
      expect(qs('nav-receptions').hidden).toBe(true);
    }finally{
      resetSession();
    }
  });
});

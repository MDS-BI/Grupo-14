import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { ROLE_FIXTURES } from '../setup/roles.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let app;
let storage;

function qs(id){ return document.getElementById(id); }
function submit(form){ form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); }

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
  app = await import('../../src/app.js');
  storage = await import('../../src/storage.js');
  await app.boot();
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 1 - users and permissions', () => {
  it('creates a user with a role from the administration view', () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana López';
    qs('user-role').value = 'solicitante';
    submit(qs('user-form'));

    const users = storage.loadUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('ana');
    expect(users[0].role).toBe('solicitante');
    expect(users[0].active).toBe(true);
    expect(qs('users-list').textContent).toContain('Ana López');
    expect(qs('users-list').textContent).toContain('Solicitante');
  });

  it('validates duplicated usernames and required fields', () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana';
    qs('user-role').value = 'solicitante';
    submit(qs('user-form'));

    qs('user-username').value = 'ana';
    qs('user-name').value = 'Otra Ana';
    submit(qs('user-form'));
    expect(storage.loadUsers()).toHaveLength(1);
    expect(qs('error-user-username').textContent).toContain('existe');
  });

  it('restricts navigation and actions based on the active role', () => {
    app.applySession(ROLE_FIXTURES.solicitante);
    expect(qs('nav-users').hidden).toBe(true);
    expect(qs('nav-documents').hidden).toBe(true);
    expect(qs('nav-requisitions').hidden).toBe(false);

    qs('nav-users').click();
    expect(qs('view-dashboard').hidden).toBe(false);
    expect(qs('view-users').hidden).toBe(true);
  });

  it('switches the active session from the session selector', () => {
    const user = storage.addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    app.applySession(ROLE_FIXTURES.admin);
    const select = qs('session-user');
    expect([...select.options].some(o => o.value === user.id)).toBe(true);
    select.value = user.id;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('nav-documents').hidden).toBe(true);
  });

  it('prevents deactivating a user with pending work and shows the warning', () => {
    const user = storage.addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    app.applySession(user);
    storage.addRequisition({
      department: 'TI',
      justification: 'Equipos',
      lineasDetalle: [{ descripcion: 'Laptop', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 1000 }]
    });
    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-users').click();

    const deactivate = [...qs('users-list').querySelectorAll('button')].find(b => b.textContent === 'Desactivar');
    deactivate.click();

    expect(qs('users-message').hidden).toBe(false);
    expect(qs('users-message').textContent).toContain('pendientes');
    expect(storage.loadUsers()[0].active).toBe(true);
  });
});

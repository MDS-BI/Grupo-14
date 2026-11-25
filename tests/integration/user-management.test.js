import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { ROLE_FIXTURES } from '../setup/roles.js';
import { injectMockData } from '../../src/mock-data.js';

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

  it('renders the full mock user table and filters by name, email and role', () => {
    injectMockData();
    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-users').click();

    const rows = () => [...qs('users-list').querySelectorAll('tr')];
    expect(rows()).toHaveLength(20);
    const tableText = qs('users-table').textContent;
    expect(tableText).toContain('Camila Herrera');
    expect(tableText).toContain('camila.herrera@empresa.cl');
    expect(tableText).toMatch(/\d{2}\.\d{3}\.\d{3}-[\dkK]/);
    expect(tableText).toContain('Inactivo');

    qs('user-search').value = 'ana.torres@';
    qs('user-search').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain('Ana Torres');

    qs('user-search').value = '';
    qs('user-search').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    qs('user-role-filter').value = 'administrador';
    qs('user-role-filter').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(rows()).toHaveLength(4);
  });

  it('shows a permission matrix that follows the active session', () => {
    injectMockData();
    app.applySession(ROLE_FIXTURES.solicitante);
    const checks = () => [...qs('permission-session-row').querySelectorAll('input')].map(i => i.checked);

    expect(qs('permission-matrix-body').querySelectorAll('tr')).toHaveLength(6);
    expect(checks()).toEqual([true, false, false, false, false, false]);

    app.applySession(ROLE_FIXTURES.compras);
    expect(checks()).toEqual([true, true, true, true, false, false]);
    const comprasRow = qs('permission-matrix-body').querySelector('[data-role="encargado_compras"]');
    expect([...comprasRow.querySelectorAll('input')].map(i => i.checked))
      .toEqual([true, true, true, true, false, false]);
  });

  it('changes a user state from the table', () => {
    storage.addUser({ username: 'sol', name: 'Sol', role: 'solicitante' });
    qs('nav-users').click();
    const buttonWithText = (text) => [...qs('users-list').querySelectorAll('button')].find(b => b.textContent === text);

    buttonWithText('Desactivar').click();
    expect(storage.loadUsers()[0].active).toBe(false);

    buttonWithText('Activar').click();
    expect(storage.loadUsers()[0].active).toBe(true);
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

  it('formats the user RUT while typing', () => {
    qs('nav-users').click();
    const input = qs('user-rut');
    for(const digit of '123456785'){
      input.value += digit;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    }
    expect(input.value).toBe('12.345.678-5');
  });

  it('explains when the user RUT has an invalid verification digit', () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana';
    qs('user-role').value = 'solicitante';
    qs('user-rut').value = '12.345.678-9';
    submit(qs('user-form'));

    expect(storage.loadUsers()).toHaveLength(0);
    expect(qs('error-user-rut').textContent).toContain('no es válido');
  });

  it('explains when the user RUT is already registered', () => {
    qs('nav-users').click();
    qs('user-username').value = 'ana';
    qs('user-name').value = 'Ana';
    qs('user-role').value = 'solicitante';
    qs('user-rut').value = '12.345.678-5';
    submit(qs('user-form'));
    expect(storage.loadUsers()).toHaveLength(1);

    qs('user-username').value = 'otro';
    qs('user-name').value = 'Otro Usuario';
    qs('user-rut').value = '12345678-5';
    submit(qs('user-form'));

    expect(storage.loadUsers()).toHaveLength(1);
    expect(qs('error-user-rut').textContent).toContain('ya está registrado');
  });
});

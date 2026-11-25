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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addUser, updateUser, loadUsers, validateUser, deactivateUser, hasPendingWorkForUser
} from '../../src/storage.js';
import { setActiveConfig } from '../../src/module-config.js';

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
});

describe('user storage', () => {
  it('creates and updates users with roles', () => {
    const user = addUser({ username: 'ana', name: 'Ana López', role: 'solicitante' });
    expect(user.id).toBeDefined();
    expect(loadUsers()).toHaveLength(1);
    const updated = updateUser(user.id, { role: 'compras', name: 'Ana L.' });
    expect(updated.role).toBe('compras');
    expect(loadUsers()[0].name).toBe('Ana L.');
  });

  it('validates required fields and roles', () => {
    expect(validateUser({ username: '', name: '', role: '' }).valid).toBe(false);
    expect(validateUser({ username: 'x', name: 'X', role: 'inventado' }).valid).toBe(false);
  });

  it('rejects duplicated usernames', () => {
    addUser({ username: 'ana', name: 'Ana', role: 'solicitante' });
    expect(() => addUser({ username: 'ANA', name: 'Otra', role: 'compras' })).toThrow(/existe/);
  });
});

describe('deactivation guard', () => {
  it('blocks deactivating a user with pending work', async () => {
    const { addEntity, addDocument } = await import('../../src/storage.js');
    const user = addUser({ username: 'ana', name: 'Ana', role: 'solicitante' });
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    addDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      status: 'borrador',
      solicitante_id: user.id
    });
    expect(hasPendingWorkForUser(user.id)).toBe(true);
    expect(() => deactivateUser(user.id)).toThrow(/pendientes/);
    expect(loadUsers()[0].active).not.toBe(false);
  });

  it('allows deactivating a user without pending work', () => {
    const user = addUser({ username: 'ana', name: 'Ana', role: 'solicitante' });
    const updated = deactivateUser(user.id);
    expect(updated.active).toBe(false);
    expect(vi.isMockFunction(updated)).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as storage from '../../src/storage.js';
import { resetSession, setSession } from '../../src/auth.js';

const store = new Map();

globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

beforeEach(() => {
  store.clear();
  setSession({ id: 'u-ana', username: 'ana', name: 'Ana Aprobador', role: 'aprobador', active: true });
});

afterEach(() => {
  resetSession();
  vi.useRealTimers();
});

describe('T120 - esquema append-only de eventos de auditoría', () => {
  it('anexa un evento con el esquema completo y la instantánea del actor', () => {
    const event = storage.appendAudit({
      entityType: 'documento',
      entityId: 'doc-1',
      action: 'aprobar_emision',
      fromStatus: 'Aprobada',
      toStatus: 'Emitida',
      reason: '  Revisado  ',
      revision: 2
    });

    expect(Object.keys(event).sort()).toEqual([
      'accion', 'at', 'createdAt', 'entidadId', 'entidadTipo', 'estadoAnterior',
      'estadoNuevo', 'id', 'motivo', 'nombre', 'revision', 'rol', 'tipo', 'userId'
    ].sort());
    expect(event).toMatchObject({
      tipo: 'EVENTO_DE_AUDITORIA',
      entidadTipo: 'documento',
      entidadId: 'doc-1',
      accion: 'aprobar_emision',
      estadoAnterior: 'Aprobada',
      estadoNuevo: 'Emitida',
      revision: 2,
      motivo: 'Revisado',
      userId: 'u-ana',
      nombre: 'Ana Aprobador',
      rol: 'Aprobador'
    });
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(event.at).toBe(event.createdAt);
    expect(Number.isNaN(Date.parse(event.at))).toBe(false);
  });

  it('requiere una acción y conserva los eventos previos sin mutarlos', () => {
    expect(() => storage.appendAudit({})).toThrow(/acción/);

    const previous = { id: 'evento-inicial', accion: 'crear', at: '2026-01-01T00:00:00.000Z' };
    storage.saveAuditEvents([previous]);
    const next = storage.appendAudit({ entityType: 'documento', entityId: 'doc-1', action: 'crear', revision: 1 });

    expect(storage.loadAuditEvents()).toEqual([previous, next]);
    expect(storage.loadAuditEvents()[0]).toEqual(previous);
    expect(storage).not.toHaveProperty('updateAuditEvent');
    expect(storage).not.toHaveProperty('deleteAuditEvent');
  });

  it('devuelve la bitácora filtrada en orden cronológico ascendente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-02T10:00:00.000Z'));
    const second = storage.appendAudit({ entityType: 'documento', entityId: 'doc-1', action: 'crear', revision: 1 });
    vi.setSystemTime(new Date('2026-06-01T09:00:00.000Z'));
    const first = storage.appendAudit({ entityType: 'documento', entityId: 'doc-1', action: 'editar', revision: 2 });
    vi.setSystemTime(new Date('2026-06-03T08:00:00.000Z'));
    const third = storage.appendAudit({ entityType: 'documento', entityId: 'doc-1', action: 'aprobar_emision', revision: 3 });
    storage.appendAudit({ entityType: 'documento', entityId: 'doc-2', action: 'crear', revision: 1 });
    storage.appendAudit({ entityType: 'proveedor', entityId: 'doc-1', action: 'crear', revision: 1 });

    const timeline = storage.auditForEntity('documento', 'doc-1');
    expect(timeline.map((event) => event.id)).toEqual([first.id, second.id, third.id]);
    expect(timeline.map((event) => event.at)).toEqual([
      '2026-06-01T09:00:00.000Z',
      '2026-06-02T10:00:00.000Z',
      '2026-06-03T08:00:00.000Z'
    ]);
    expect(storage.auditForEntity(undefined, 'doc-1').map((event) => event.entidadTipo)).toEqual([
      'documento', 'documento', 'documento'
    ]);
    expect(storage.auditForEntity(undefined, 'doc-1')).toHaveLength(3);
    expect(storage.auditForEntity('documento', 'doc-2')).toHaveLength(1);
  });
});

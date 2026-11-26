import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let storage;

function qs(id){ return document.getElementById(id); }

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  w.localStorage.clear();
  vi.resetModules();
  storage = await import('../../src/storage.js');
});

afterEach(() => {
  dom.window.close();
});

function renderTimeline(container, events){
  container.replaceChildren();
  events.forEach((event) => {
    const item = document.createElement('li');
    item.dataset.eventId = event.id;
    item.dataset.action = event.accion;
    const time = document.createElement('time');
    time.dateTime = event.at;
    time.textContent = event.at;
    const detail = document.createElement('span');
    detail.textContent = `${event.nombre} (${event.rol}) · ${event.accion}`;
    item.append(time, detail);
    container.appendChild(item);
  });
}

describe('T121 - línea de tiempo por documento sin acciones de edición', () => {
  it('muestra sólo los eventos del documento en orden cronológico y sin controles de edición', () => {
    const entity = storage.addEntity({
      name: 'Proveedor Uno',
      code: 'PR-1',
      taxId: '12.345.678-5',
      categoriaProveedor: 'Servicios',
      paymentTerms: 'neto 30',
      creditLimit: 100000
    });
    const doc = storage.addDocument({
      entityId: entity.entity_id,
      folio: 1001,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'Aprobada',
      totalAmount: 1000,
      fechaEstimadaEntrega: '2026-11-20',
      tipoDocumento: 'Orden de Compra'
    });
    storage.approveDocument(doc.id);
    storage.appendAudit({ entityType: 'documento', entityId: 'otro-documento', action: 'crear', revision: 1 });

    const events = storage.auditForEntity('documento', doc.id);
    expect(events.map((event) => event.accion)).toEqual(['crear', 'aprobar_emision']);
    expect(events.map((event) => event.revision)).toEqual([1, 2]);
    expect(events.every((event) => event.nombre && event.rol)).toBe(true);
    expect(events[0].at <= events[1].at).toBe(true);

    const timeline = globalThis.document.createElement('ol');
    renderTimeline(timeline, events);
    qs('dash-activity-list').replaceWith(timeline);

    expect(timeline.children).toHaveLength(2);
    expect(timeline.querySelectorAll('button, input, select, textarea, [contenteditable="true"], [role="button"]')).toHaveLength(0);
    expect(storage).not.toHaveProperty('updateAuditEvent');
    expect(storage).not.toHaveProperty('deleteAuditEvent');
    expect(storage.auditForEntity('documento', document.id)).toEqual(events);
  });

  it('conserva la línea de tiempo aunque cambie el estado del documento', () => {
    const entity = storage.addEntity({
      name: 'Proveedor Dos',
      code: 'PR-2',
      taxId: '98.654.321-K',
      categoriaProveedor: 'Servicios',
      paymentTerms: 'neto 15',
      creditLimit: 50000
    });
    const doc = storage.addDocument({
      entityId: entity.entity_id,
      folio: 2001,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'Aprobada',
      totalAmount: 500,
      tipoDocumento: 'Orden de Compra'
    });
    storage.approveDocument(doc.id);
    storage.cancelDocument(doc.id);

    const events = storage.auditForEntity('documento', doc.id);
    expect(events.map((event) => event.accion)).toEqual(['crear', 'aprobar_emision', 'cancelar']);
    expect(events.map((event) => event.estadoNuevo)).toEqual(['Aprobada', 'Emitida', 'Rechazada']);
    expect(events.map((event) => event.revision)).toEqual([1, 2, 3]);
    expect(storage.loadAuditEvents().filter((event) => event.entidadId === doc.id)).toHaveLength(3);
  });
});

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

function addEntity(overrides = {}){
  return storage.addEntity({
    name: 'Proveedor Aprobable',
    code: 'PA-1',
    taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios',
    paymentTerms: 'neto 30',
    creditLimit: 100000,
    ...overrides
  });
}

function addDraft(entity, overrides = {}){
  return storage.addDocument({
    entityId: entity.entity_id,
    series: 'SOL',
    folio: 500,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    status: 'cotización',
    tipoDocumento: 'Solicitud de Cotización',
    fechaEmision: '2026-01-01',
    lineasDetalle: [
      { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 }
    ],
    ...overrides
  });
}

function selectDocument(id){
  const select = qs('edit-document');
  select.value = id;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

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

describe('User Story 3 - order approval lifecycle', () => {
  it('approves a complete order, generates the OC series/folio and updates the dashboard', () => {
    const entity = addEntity();
    const draft = addDraft(entity);
    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-documents').click();
    selectDocument(draft.id);

    qs('document-approve').click();

    const approved = storage.loadDocuments()[0];
    expect(approved.status).toBe('aprobado');
    expect(approved.series).toBe('OC');
    expect(Number(approved.folio)).toBeGreaterThan(0);
    expect(qs('stat-orders').textContent).toBe('1');
  });

  it('blocks approval when the provider lacks commercial data', () => {
    const entity = addEntity({ taxId: '', paymentTerms: '', creditLimit: undefined });
    const draft = addDraft(entity);
    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-documents').click();
    selectDocument(draft.id);

    qs('document-approve').click();

    expect(storage.loadDocuments()[0].status).toBe('cotización');
    expect(qs('error-status').textContent).toContain('Faltan datos comerciales');
  });

  it('cancels a draft order and rejects invalid transitions', () => {
    const entity = addEntity();
    const draft = addDraft(entity);
    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-documents').click();
    selectDocument(draft.id);

    qs('document-cancel').click();
    expect(storage.loadDocuments()[0].status).toBe('cancelado');

    expect(() => storage.cancelDocument(draft.id)).toThrow();
  });
});

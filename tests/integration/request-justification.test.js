import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadDocuments, PENDING_STATUS } from '../../src/storage.js';

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

function fillRequest(){
  const entity = addEntity({ name: 'Acme', code: 'AC-001' });
  qs('nav-documents').click();
  qs('document-entity').value = entity.entity_id;
  qs('folio').value = '10';
  qs('startDate').value = '2026-08-01';
  qs('endDate').value = '2026-08-05';
  qs('cf-tipoDocumento').value = 'Solicitud de Cotización';
  qs('cf-fechaEmision').value = '2026-08-01';
  qs('cf-departamento').value = 'Producción';
}

describe('User Story 7 - request justification', () => {
  it('blocks a request when the justification is empty', () => {
    fillRequest();
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadDocuments()).toHaveLength(0);
    expect(qs('error-justificacion').textContent).toMatch(/justificación/);
  });

  it('saves the request as pending with the justification and shows it in the list', () => {
    fillRequest();
    qs('justificacion').value = 'Se requieren insumos para el taller';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const docs = loadDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].status).toBe(PENDING_STATUS);
    expect(docs[0].justificacion).toBe('Se requieren insumos para el taller');

    qs('nav-search').click();
    qs('doc-search-input').value = 'insumos';
    qs('doc-search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('doc-search-results-list').textContent).toContain('Justificación');
  });
});

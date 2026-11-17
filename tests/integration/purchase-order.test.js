import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadDocuments } from '../../src/storage.js';

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

function fillLine(rowIndex, values){
  const rows = document.querySelectorAll('#document-lineas .linea-row');
  const row = rows[rowIndex];
  row.querySelector('.linea-producto').value = values.producto;
  row.querySelector('.linea-descripcion').value = values.descripcion;
  row.querySelector('.linea-cantidad').value = String(values.cantidad);
  row.querySelector('.linea-unidad').value = values.unidad;
  row.querySelector('.linea-precio').value = String(values.precio);
  row.querySelector('.linea-descuento').value = String(values.descuento || 0);
}

describe('User Story 2 - purchase order with detail lines', () => {
  it('creates an order with multiple lines and cascaded totals', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('series').value = 'OC';
    qs('folio').value = '1';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('currency').value = 'MXN';
    qs('status').value = 'borrador';
    qs('cf-tipoDocumento').value = 'Orden de Compra';
    qs('cf-fechaEmision').value = '2026-08-01';
    fillLine(0, { producto: 'P-1', descripcion: 'Monitor', cantidad: 2, unidad: 'unidades', precio: 100, descuento: 10 });
    qs('lineas-add').click();
    fillLine(1, { producto: 'P-2', descripcion: 'Cable', cantidad: 1, unidad: 'unidades', precio: 50 });

    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    const docs = loadDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].lineasDetalle).toHaveLength(2);
    expect(docs[0].subtotal).toBe(230);
    expect(docs[0].taxAmount).toBe(36.8);
    expect(docs[0].totalAmount).toBe(266.8);
    expect(docs[0].currency).toBe('MXN');
  });

  it('blocks a line with a zero quantity and explains the problem', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('folio').value = '2';
    qs('startDate').value = '2026-08-01';
    qs('endDate').value = '2026-08-05';
    qs('cf-tipoDocumento').value = 'Orden de Compra';
    qs('cf-fechaEmision').value = '2026-08-01';
    fillLine(0, { producto: 'P-1', descripcion: 'Monitor', cantidad: 0, unidad: 'unidades', precio: 100 });

    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadDocuments()).toHaveLength(0);
    expect(qs('error-lineasDetalle').textContent).toMatch(/cantidad/);
  });
});

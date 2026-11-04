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
function fillLine(index, values){
  const row = qs('document-detail-lines').querySelectorAll('.detail-line')[index];
  Object.entries(values).forEach(([field, value]) => {
    row.querySelector(`[data-field="${field}"]`).value = value;
  });
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

describe('User Story 2 - purchase order with detail lines', () => {
  it('saves the provider, the lines and the computed totals', () => {
    const entity = storage.addEntity({
      name: 'Proveedor Uno',
      code: 'PR-1',
      taxId: 'RFC123456789',
      categoriaProveedor: 'Servicios',
      paymentTerms: 'neto 30',
      creditLimit: 100000
    });
    app.applySession(ROLE_FIXTURES.compras);
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('series').value = 'OC';
    qs('folio').value = '1001';
    qs('startDate').value = '2026-01-01';
    qs('endDate').value = '2026-01-10';
    qs('status').value = 'borrador';
    qs('cf-tipoDocumento').value = 'Orden de Compra';
    qs('cf-fechaEmision').value = '2026-01-01';

    qs('add-detail-line').click();
    fillLine(0, {
      producto_id: 'SKU-1',
      descripcion: 'Caja',
      cantidad: '2',
      unidadMedida: 'cajas',
      precioUnitario: '100',
      porcentajeDescuentoLinea: '10'
    });
    qs('add-detail-line').click();
    fillLine(1, {
      producto_id: 'SKU-2',
      descripcion: 'Sobre',
      cantidad: '1',
      unidadMedida: 'unidades',
      precioUnitario: '50',
      porcentajeDescuentoLinea: '0'
    });
    qs('discount').value = '50';
    submit(qs('document-form'));

    const docs = storage.loadDocuments();
    expect(docs).toHaveLength(1);
    const doc = docs[0];
    expect(doc.entity_id).toBe(entity.entity_id);
    expect(doc.lineasDetalle).toHaveLength(2);
    expect(doc.lineasDetalle[0].documento_id).toBe(doc.id);
    expect(doc.lineasDetalle[0].subtotalLinea).toBe(180);
    expect(doc.lineasDetalle[1].subtotalLinea).toBe(50);
    expect(doc.subtotal).toBe(230);
    expect(doc.discount).toBe(50);
    expect(doc.taxAmount).toBe(28.8);
    expect(doc.totalAmount).toBe(208.8);
  });

  it('blocks the order when a line is incomplete', () => {
    const entity = storage.addEntity({ name: 'Proveedor Dos', code: 'PR-2' });
    app.applySession(ROLE_FIXTURES.compras);
    qs('nav-documents').click();
    qs('document-entity').value = entity.entity_id;
    qs('folio').value = '1002';
    qs('startDate').value = '2026-01-01';
    qs('endDate').value = '2026-01-10';
    qs('cf-tipoDocumento').value = 'Orden de Compra';
    qs('cf-fechaEmision').value = '2026-01-01';
    qs('add-detail-line').click();
    fillLine(0, { producto_id: 'SKU-1', descripcion: '', cantidad: '0', unidadMedida: 'cajas', precioUnitario: '10' });
    submit(qs('document-form'));

    expect(storage.loadDocuments()).toHaveLength(0);
    expect(qs('document-detail-lines').textContent).toContain('descripción');
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let app;
let storage;

function qs(id){ return document.getElementById(id); }

function setField(row, field, value){
  const input = row.querySelector(`[data-field="${field}"]`);
  input.value = String(value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

function addLine(line){
  qs('add-detail-line').click();
  const row = qs('document-detail-lines').querySelector('.detail-line:last-child');
  setField(row, 'producto_id', line.producto_id);
  setField(row, 'descripcion', line.descripcion);
  setField(row, 'cantidad', line.cantidad);
  setField(row, 'unidadMedida', line.unidadMedida);
  setField(row, 'precioUnitario', line.precioUnitario);
  if(line.porcentajeDescuentoLinea !== undefined) setField(row, 'porcentajeDescuentoLinea', line.porcentajeDescuentoLinea);
  return row;
}

function baseDocument(){
  const entity = storage.addEntity({ name: 'Proveedor Líneas', code: 'PL-1' });
  qs('nav-documents').click();
  qs('document-entity').value = entity.entity_id;
  qs('folio').value = '1001';
  qs('startDate').value = '2026-01-01';
  qs('endDate').value = '2026-01-10';
  qs('cf-tipoDocumento').value = 'Orden de Compra';
  qs('cf-fechaEmision').value = '2026-01-01';
  qs('discount').value = '50';
  qs('discount').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  return entity;
}

function submit(){
  qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function selectForEdit(id){
  qs('edit-document').value = id;
  qs('edit-document').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
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

describe('Líneas de detalle en el formulario de documentos', () => {
  it('crea, edita y elimina líneas recalculando la cabecera', () => {
    baseDocument();
    addLine({ producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 });
    addLine({ producto_id: 'SKU-2', descripcion: 'Cinta', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 50 });
    submit();

    let doc = storage.loadDocuments()[0];
    expect(doc.lineasDetalle).toHaveLength(2);
    expect(doc.subtotal).toBe(250);
    expect(doc.taxAmount).toBe(38);
    expect(doc.totalAmount).toBe(238);

    selectForEdit(doc.id);
    const firstRow = qs('document-detail-lines').querySelector('.detail-line');
    setField(firstRow, 'cantidad', 3);
    submit();

    doc = storage.loadDocuments()[0];
    expect(doc.lineasDetalle[0].cantidad).toBe(3);
    expect(doc.subtotal).toBe(350);
    expect(doc.totalAmount).toBe(357);

    selectForEdit(doc.id);
    qs('document-detail-lines').querySelectorAll('.detail-line')[1].querySelector('button').click();
    submit();

    doc = storage.loadDocuments()[0];
    expect(doc.lineasDetalle).toHaveLength(1);
    expect(doc.subtotal).toBe(300);
  });

  it('aplica descuento global e impuesto configurado sobre el subtotal de líneas', () => {
    baseDocument();
    addLine({ producto_id: 'SKU-3', descripcion: 'Papel', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100, porcentajeDescuentoLinea: 0 });
    expect(qs('subtotal').readOnly).toBe(true);
    submit();

    const doc = storage.loadDocuments()[0];
    expect(doc.subtotal).toBe(200);
    expect(doc.discount).toBe(50);
    expect(doc.taxAmount).toBe(28.5);
    expect(doc.totalAmount).toBe(178.5);
  });
});

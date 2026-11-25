import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let app;
let storage;

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
  app = await import('../../src/app.js');
  storage = await import('../../src/storage.js');
  await app.boot();
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 11 - cerrar orden en Pagada', () => {
  it('registra factura y pago desde el formulario de documentos', () => {
    const entity = storage.addEntity({ name: 'Proveedor', code: 'PV-1' });
    const doc = storage.addDocument({
      entityId: entity.entity_id,
      folio: 1001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      tipoDocumento: 'Orden de Compra',
      fechaEmision: '2026-01-01',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });
    storage.patchDocument(doc.id, { status: 'Recibida' });

    qs('nav-documents').click();
    qs('edit-document').value = doc.id;
    qs('edit-document').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(qs('document-pay').hidden).toBe(false);

    qs('payment-invoice').value = 'DTE-123';
    qs('payment-amount').value = String(doc.totalAmount);
    qs('payment-date').value = '2026-01-20';
    qs('document-pay').click();

    expect(qs('error-payment').textContent).toBe('');
    expect(storage.loadDocuments()[0].status).toBe('Pagada');
    expect(qs('document-pay').hidden).toBe(true);
  });
});

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

describe('T117 - pago con tolerancia y bloqueos desde la interfaz', () => {
  function selectDocument(id){
    qs('edit-document').value = id;
    qs('edit-document').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  }

  function seedReceivedOrder(storage, folio = 4001){
    const entity = storage.addEntity({
      name: 'Proveedor Pago', code: `PV-${folio}`, creditLimit: 10000, paymentTerms: '30 días'
    });
    const doc = storage.addDocument({
      entityId: entity.entity_id,
      folio,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      tipoDocumento: 'Orden de Compra',
      fechaEmision: '2026-01-01',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });
    return { entity, doc: storage.patchDocument(doc.id, { status: 'Recibida' }) };
  }

  it('acepta 0,01 CLP de diferencia, muestra el error mayor y actualiza el crédito', async () => {
    const storage = await import('../../src/storage.js');
    const { entity, doc } = seedReceivedOrder(storage);
    expect(storage.creditUsedForEntity(entity.entity_id)).toBe(0);

    qs('nav-documents').click();
    selectDocument(doc.id);
    qs('payment-invoice').value = 'DTE-301';
    qs('payment-amount').value = String(doc.totalAmount + 0.01);
    qs('payment-date').value = '2026-01-20';
    qs('document-pay').click();

    expect(qs('error-payment').textContent).toBe('');
    expect(storage.loadDocuments()[0].status).toBe('Pagada');
    expect(storage.loadDocuments()[0].diferenciaPago).toBeCloseTo(0.01, 2);
    expect(storage.creditUsedForEntity(entity.entity_id)).toBeCloseTo(doc.totalAmount + 0.01, 2);
    expect(storage.availableCreditForEntity(entity.entity_id)).toBeCloseTo(10000 - doc.totalAmount - 0.01, 2);

    const second = seedReceivedOrder(storage, 4002);
    qs('nav-documents').click();
    selectDocument(second.doc.id);
    qs('payment-invoice').value = 'DTE-302';
    qs('payment-amount').value = String(second.doc.totalAmount + 1);
    qs('payment-date').value = '2026-01-20';
    qs('document-pay').click();

    expect(qs('error-payment').textContent).toMatch(/diferencia/);
    expect(qs('error-payment').textContent).toMatch(/nota de ajuste/);
    expect(storage.loadDocuments().find(d => d.id === second.doc.id).status).toBe('Recibida');
  });

  it('oculta el pago antes de Recibida y tras pagar impide nueva edición', async () => {
    const storage = await import('../../src/storage.js');
    const entity = storage.addEntity({ name: 'Proveedor Bloqueado', code: 'PV-BLQ' });
    const doc = storage.addDocument({
      entityId: entity.entity_id,
      folio: 4003,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      tipoDocumento: 'Orden de Compra',
      fechaEmision: '2026-01-01',
      status: 'Emitida',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 1, unidadMedida: 'cajas', precioUnitario: 100 }
      ]
    });

    qs('nav-documents').click();
    selectDocument(doc.id);
    expect(qs('document-pay').hidden).toBe(true);
    storage.patchDocument(doc.id, { status: 'Recibida parcialmente' });
    selectDocument(doc.id);
    expect(qs('document-pay').hidden).toBe(true);

    storage.patchDocument(doc.id, { status: 'Recibida' });
    selectDocument(doc.id);
    expect(qs('document-pay').hidden).toBe(false);
    qs('payment-invoice').value = 'DTE-303';
    qs('payment-amount').value = String(doc.totalAmount);
    qs('payment-date').value = '2026-01-20';
    qs('document-pay').click();
    expect(qs('document-pay').hidden).toBe(true);
    expect(() => storage.updateDocument(doc.id, { notes: 'Edición tardía' })).toThrow(/no permite edición posterior/);
  });

  it('registra la nota de ajuste por la API cuando la diferencia supera la tolerancia', async () => {
    const storage = await import('../../src/storage.js');
    const { doc } = seedReceivedOrder(storage, 4004);
    const paid = storage.payOrder(doc.id, {
      factura: 'DTE-304',
      monto: doc.totalAmount + 5,
      fechaPago: '2026-01-20',
      nota: 'Ajuste por flete'
    });
    expect(paid.status).toBe('Pagada');
    expect(paid.diferenciaPago).toBeCloseTo(5, 2);
    expect(paid.notaAjuste).toBe('Ajuste por flete');
  });
});

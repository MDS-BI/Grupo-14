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

function addApprovedOrder(){
  const entity = storage.addEntity({
    name: 'Proveedor Recepción',
    code: 'PR-REC',
    taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios',
    paymentTerms: 'neto 30',
    creditLimit: 100000
  });
  return storage.addDocument({
    entityId: entity.entity_id,
    series: 'OC',
    folio: 2001,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    status: 'aprobado',
    tipoDocumento: 'Orden de Compra',
    fechaEmision: '2026-01-01',
    lineasDetalle: [
      { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 10, unidadMedida: 'cajas', precioUnitario: 100 }
    ]
  });
}

function selectFirstOrder(){
  const button = qs('receptions-list').querySelector('button');
  expect(button).toBeTruthy();
  button.click();
}

function setReception(values){
  const container = qs('reception-detail');
  Object.entries(values).forEach(([field, value]) => {
    const input = container.querySelector(`[data-field="${field}"][data-index="0"]`);
    input.value = value;
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

describe('User Story 6 - reception', () => {
  it('registers a partial reception with a rejection reason', () => {
    const order = addApprovedOrder();
    app.applySession(ROLE_FIXTURES.recepcion);
    qs('nav-receptions').click();
    expect(qs('receptions-empty').hidden).toBe(true);
    selectFirstOrder();

    setReception({ cantidadRecibida: '4', cantidadRechazada: '1', motivoRechazo: 'Dañada' });
    qs('reception-submit-button').click();

    const receptions = storage.loadReceptions();
    expect(receptions).toHaveLength(1);
    expect(receptions[0].orderId).toBe(order.id);
    expect(receptions[0].lineas[0].cantidadRecibida).toBe(4);
    expect(receptions[0].lineas[0].cantidadRechazada).toBe(1);
    expect(receptions[0].lineas[0].motivoRechazo).toBe('Dañada');
    expect(storage.loadDocuments()[0].status).toBe('recibido parcialmente');
  });

  it('completes the order when the pending quantity is received', () => {
    addApprovedOrder();
    app.applySession(ROLE_FIXTURES.recepcion);
    qs('nav-receptions').click();
    selectFirstOrder();
    setReception({ cantidadRecibida: '10', cantidadRechazada: '0', motivoRechazo: '' });
    qs('reception-submit-button').click();

    expect(storage.loadDocuments()[0].status).toBe('recibido');
    expect(qs('receptions-empty').hidden).toBe(false);
    expect(qs('stat-receptions').textContent).toBe('1');
  });

  it('requires a reason when a line is rejected', () => {
    addApprovedOrder();
    app.applySession(ROLE_FIXTURES.recepcion);
    qs('nav-receptions').click();
    selectFirstOrder();
    setReception({ cantidadRecibida: '0', cantidadRechazada: '1', motivoRechazo: '' });
    qs('reception-submit-button').click();

    expect(storage.loadReceptions()).toHaveLength(0);
    expect(qs('reception-detail').textContent).toContain('motivo del rechazo');
  });

  it('restricts reception to the receiving role', () => {
    addApprovedOrder();
    app.applySession(ROLE_FIXTURES.solicitante);
    expect(qs('nav-receptions').hidden).toBe(true);
    qs('nav-receptions').click();
    expect(qs('view-receptions').hidden).toBe(true);
    expect(qs('view-dashboard').hidden).toBe(false);
  });
});

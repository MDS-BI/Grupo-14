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

function seedAuthorizedRequest(){
  const entity = storage.addEntity({
    name: 'Proveedor Cotizado',
    code: 'PC-1',
    taxId: 'RFC123456789',
    paymentTerms: 'neto 30',
    creditLimit: 100000,
    categoriaProveedor: 'Servicios'
  });
  const requisition = storage.addRequisition({
    department: 'TI',
    justification: 'Renovar estaciones de trabajo',
    lineasDetalle: [
      { descripcion: 'Laptop', cantidad: 2, unidadMedida: 'unidades', precioEstimado: 1000 }
    ]
  });
  app.applySession(ROLE_FIXTURES.admin);
  storage.approveRequisition(requisition.id);
  return { entity, requisition };
}

describe('User Story 5 - generar cotización desde solicitud autorizada', () => {
  it('muestra las solicitudes autorizadas y genera la cotización con precios por línea', () => {
    const { entity, requisition } = seedAuthorizedRequest();
    app.applySession(ROLE_FIXTURES.compras);

    qs('nav-requisitions').click();
    expect(qs('quotation-card').hidden).toBe(false);
    expect(qs('quotations-list').textContent).toContain('Renovar estaciones de trabajo');
    expect(qs('quotation-entity').value).toBe(entity.entity_id);

    qs('quotation-lines').querySelector('[data-quotation-line]').value = '1200';
    qs('quotation-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(qs('error-quotation').textContent).toBe('');
    expect(storage.loadQuotations()).toHaveLength(1);
    expect(storage.loadQuotations()[0].requisitionId).toBe(requisition.id);
    expect(storage.loadRequisitions()[0].status).toBe(storage.REQUISITION_STATUS.IN_QUOTATION);
    expect(qs('quotations-list').querySelectorAll('li')).toHaveLength(0);
  });

  it('bloquea la bandeja para roles sin permiso de compras', () => {
    seedAuthorizedRequest();
    app.applySession(ROLE_FIXTURES.solicitante);

    qs('nav-requisitions').click();
    expect(qs('quotation-card').hidden).toBe(true);
    expect(storage.loadQuotations()).toHaveLength(0);
  });
});

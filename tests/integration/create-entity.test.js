import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadEntities, loadDocuments } from '../../src/storage.js';

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

describe('User Story 1 - create and organize entities', () => {
  it('creates a new entity that appears in storage and the edit selector', () => {
    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const all = loadEntities();
    expect(all.length).toBe(1);
    expect(all[0].name).toBe('Acme');
    expect(all[0].code).toBe('AC-001');
    expect(all[0].entity_id).toBeDefined();
    expect(all[0].categoriaProveedor).toBe('Servicios');
    const select = qs('edit-entity');
    expect([...select.options].map(o => o.textContent)).toContain('Acme — AC-001');
  });

  it('persists ERP identity and commercial fields entered through the form', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('taxId').value = '12.345.678-5';
    qs('email').value = 'ventas@acme.mx';
    qs('phone').value = '555-1234';
    qs('address').value = 'Av. Reforma 100';
    qs('creditLimit').value = '50000';
    qs('paymentTerms').value = 'neto 30';
    qs('cf-categoriaProveedor').value = 'Materias primas';
    qs('cf-vendedorContacto').value = 'Laura Pérez';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    const saved = loadEntities()[0];
    expect(saved.taxId).toBe('12.345.678-5');
    expect(saved.email).toBe('ventas@acme.mx');
    expect(saved.phone).toBe('555-1234');
    expect(saved.address).toBe('Av. Reforma 100');
    expect(saved.creditLimit).toBe(50000);
    expect(saved.paymentTerms).toBe('neto 30');
    expect(saved.categoriaProveedor).toBe('Materias primas');
    expect(saved.vendedorContacto).toBe('Laura Pérez');
  });

  it('rejects a malformed email with an explanation', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('email').value = 'no-es-correo';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(0);
    expect(qs('error-email').textContent).toContain('correo electrónico');
  });

  it('prevents saving when required information is blank and explains what is needed', () => {
    qs('nav-entities').click();
    qs('name').value = '';
    qs('code').value = '';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities().length).toBe(0);
    expect(qs('error-name').textContent).toContain('obligatorio');
    expect(qs('error-code').textContent).toContain('obligatorio');
  });

  it('formats the RUT while typing', () => {
    qs('nav-entities').click();
    const input = qs('taxId');
    for(const digit of '123456785'){
      input.value += digit;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    }
    expect(input.value).toBe('12.345.678-5');
  });

  it('explains when the provider RUT has an invalid verification digit', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('taxId').value = '12.345.678-9';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadEntities()).toHaveLength(0);
    expect(qs('error-taxId').textContent).toContain('no es válido');
  });

  it('reports a missing required custom field on its own error element', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadEntities()).toHaveLength(0);
    expect(qs('error-cf-categoriaProveedor').textContent).toContain('obligatorio');
    expect(qs('error-name').textContent).toBe('');
    expect(qs('error-code').textContent).toBe('');
  });

  it('reports invalid email and negative credit limit independently', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('email').value = 'correo-invalido';
    qs('creditLimit').value = '-5';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadEntities()).toHaveLength(0);
    expect(qs('error-email').textContent).toContain('correo electrónico');
    expect(qs('error-creditLimit').textContent).toContain('no negativo');
    expect(qs('error-name').textContent).toBe('');
  });

  it('shows an impossible target date error on the date field only', () => {
    qs('nav-entities').click();
    Object.defineProperty(qs('targetDate'), 'value', { configurable: true, value: '2026-02-30' });
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadEntities()).toHaveLength(0);
    expect(qs('error-targetDate').textContent).toContain('fecha válida');
    expect(qs('error-name').textContent).toBe('');
    expect(qs('error-code').textContent).toBe('');
  });

  it('shows an inverted document date range on the end-date field only', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()).toHaveLength(1);

    qs('nav-documents').click();
    qs('document-entity').value = loadEntities()[0].entity_id;
    qs('folio').value = '1001';
    qs('startDate').value = '2026-08-10';
    qs('endDate').value = '2026-08-01';
    qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadDocuments()).toHaveLength(0);
    expect(qs('error-endDate').textContent).toContain('posterior a la fecha de inicio');
    expect(qs('error-startDate').textContent).toBe('');
  });

  it('explains when the provider RUT is already registered', () => {
    qs('nav-entities').click();
    qs('name').value = 'Acme';
    qs('code').value = 'AC-001';
    qs('taxId').value = '12.345.678-5';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    expect(loadEntities()).toHaveLength(1);

    qs('name').value = 'Otra Acme';
    qs('code').value = 'AC-002';
    qs('taxId').value = '12345678-5';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    expect(loadEntities()).toHaveLength(1);
    expect(qs('error-taxId').textContent).toContain('ya está registrado');
  });
});

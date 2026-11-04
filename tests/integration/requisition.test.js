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
function setLine(row, field, value){
  const input = qs('requisition-lines').querySelectorAll('.detail-line')[row].querySelector(`[data-field="${field}"]`);
  input.value = value;
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

describe('User Story 7 - requisitions with justification', () => {
  it('creates a pending requisition with products and justification', () => {
    app.applySession(ROLE_FIXTURES.solicitante);
    qs('nav-requisitions').click();
    qs('requisition-department').value = 'TI';
    qs('requisition-budget-line').value = 'Equipos';
    qs('requisition-justification').value = 'Renovar laptops del equipo de soporte';
    setLine(0, 'descripcion', 'Laptop');
    setLine(0, 'cantidad', '2');
    setLine(0, 'unidadMedida', 'unidades');
    setLine(0, 'precioEstimado', '15000');
    submit(qs('requisition-form'));

    const list = storage.loadRequisitions();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe(storage.REQUISITION_STATUS.PENDING);
    expect(list[0].department).toBe('TI');
    expect(list[0].justification).toBe('Renovar laptops del equipo de soporte');
    expect(list[0].lineasDetalle).toHaveLength(1);
    expect(qs('requisitions-list').textContent).toContain('Renovar laptops del equipo de soporte');
  });

  it('blocks the request when the justification is empty', () => {
    app.applySession(ROLE_FIXTURES.solicitante);
    qs('nav-requisitions').click();
    qs('requisition-department').value = 'TI';
    qs('requisition-justification').value = '';
    setLine(0, 'descripcion', 'Laptop');
    setLine(0, 'cantidad', '1');
    setLine(0, 'precioEstimado', '1000');
    submit(qs('requisition-form'));

    expect(storage.loadRequisitions()).toHaveLength(0);
    expect(qs('error-requisition-justification').textContent).toContain('justificación');
  });

  it('shows the full justification in the requester history', () => {
    app.applySession(ROLE_FIXTURES.solicitante);
    storage.addRequisition({
      department: 'TI',
      justification: 'Compra urgente por auditoría externa',
      lineasDetalle: [{ descripcion: 'Monitor', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 5000 }]
    });
    qs('nav-requisitions').click();
    expect(qs('requisitions-list').textContent).toContain('Compra urgente por auditoría externa');
  });
});

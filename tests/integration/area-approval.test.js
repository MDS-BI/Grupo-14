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

function addRequisition(department = 'TI'){
  return storage.addRequisition({
    department,
    justification: `Compra del área ${department}`,
    lineasDetalle: [{ descripcion: 'Artículo', cantidad: 2, unidadMedida: 'unidades', precioEstimado: 1000 }]
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

describe('User Story 4 - department approval', () => {
  it('lists pending requests, shows the justification and budget, and authorizes one', () => {
    const requisition = addRequisition('TI');
    app.applySession(ROLE_FIXTURES.aprobador);
    qs('nav-approvals').click();

    expect(qs('approvals-empty').hidden).toBe(true);
    const button = qs('approvals-list').querySelector('button');
    expect(button.textContent).toContain(requisition.folio);
    button.click();

    expect(qs('approval-detail').textContent).toContain('Compra del área TI');
    expect(qs('approval-detail').textContent).toContain('Presupuesto del área');

    qs('approve-requisition').click();
    expect(storage.loadRequisitions()[0].status).toBe(storage.REQUISITION_STATUS.APPROVED);
    expect(qs('approvals-empty').hidden).toBe(false);
  });

  it('requires a rejection reason and keeps the request pending without it', () => {
    addRequisition('TI');
    app.applySession(ROLE_FIXTURES.aprobador);
    qs('nav-approvals').click();
    qs('approvals-list').querySelector('button').click();

    qs('rejection-reason').value = '';
    qs('reject-requisition').click();
    expect(storage.loadRequisitions()[0].status).toBe(storage.REQUISITION_STATUS.PENDING);
    expect(qs('error-rejection-reason').textContent).toContain('motivo');

    qs('rejection-reason').value = 'Sin presupuesto disponible';
    qs('reject-requisition').click();
    expect(storage.loadRequisitions()[0].status).toBe(storage.REQUISITION_STATUS.REJECTED);
    expect(storage.loadRequisitions()[0].rejectionReason).toBe('Sin presupuesto disponible');
  });

  it('restricts the approval inbox to the approver role', () => {
    addRequisition('TI');
    app.applySession(ROLE_FIXTURES.solicitante);
    expect(qs('nav-approvals').hidden).toBe(true);
    qs('nav-approvals').click();
    expect(qs('view-approvals').hidden).toBe(true);
    expect(qs('view-dashboard').hidden).toBe(false);
  });
});

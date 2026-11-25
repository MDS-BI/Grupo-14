import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { setActiveConfig, userConfig } from '../../src/module-config.js';
import {
  addRequisition, loadRequisitions, REQUISITION_STATUS
} from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

function seedRequest(){
  return addRequisition({
    department: 'Producción',
    justification: 'Insumos para el taller',
    requesterName: 'Ana Solicitante',
    lineasDetalle: [
      { descripcion: 'Insumos', cantidad: 2, unidadMedida: 'cajas', precioEstimado: 2000 }
    ]
  });
}

function selectFirstRequest(){
  const button = qs('approvals-list').querySelector('button');
  expect(button).not.toBeNull();
  button.click();
}

beforeEach(async () => {
  setActiveConfig(userConfig);
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

describe('User Story 4 - department approval inbox', () => {
  it('shows the justification before the approval actions and authorizes the request', () => {
    seedRequest();
    qs('nav-approvals').click();
    expect(qs('view-approvals').hidden).toBe(false);
    expect(qs('approvals-list').textContent).toContain('Insumos para el taller');

    selectFirstRequest();
    expect(qs('approval-detail').textContent).toContain('Insumos para el taller');
    qs('approve-requisition').click();

    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.APPROVED);
    expect(qs('approvals-list').querySelectorAll('button')).toHaveLength(0);
    expect(qs('approvals-empty').hidden).toBe(false);
  });

  it('requires a motive before rejecting a request', () => {
    seedRequest();
    qs('nav-approvals').click();
    selectFirstRequest();

    qs('reject-requisition').click();
    expect(qs('error-rejection-reason').textContent).toMatch(/motivo/);
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.PENDING);

    qs('rejection-reason').value = 'Sin presupuesto';
    qs('reject-requisition').click();
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.REJECTED);
  });
});

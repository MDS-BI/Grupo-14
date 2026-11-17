import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { setActiveConfig, userConfig } from '../../src/module-config.js';
import {
  addEntity, addDocument, loadDocuments, PENDING_STATUS
} from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

function seedRequest(overrides = {}){
  const entity = addEntity({
    name: 'Acme', code: 'AC-001', taxId: 'RFC800101AB1', paymentTerms: 'neto 30',
    creditLimit: 10000, categoriaProveedor: 'Materias primas'
  });
  return addDocument({
    entityId: entity.entity_id,
    folio: 1,
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    status: PENDING_STATUS,
    tipoDocumento: 'Solicitud de Cotización',
    fechaEmision: '2026-08-01',
    justificacion: 'Insumos para el taller',
    departamento: 'Producción',
    presupuestoDisponible: 5000,
    totalAmount: 4000,
    ...overrides
  });
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
  globalThis.prompt = vi.fn(() => 'Autorizado');
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
    const item = qs('approval-list').querySelector('.approval-item');
    expect(item.textContent).toContain('Insumos para el taller');
    expect(item.querySelector('.approval-approve')).not.toBeNull();

    item.querySelector('.approval-approve').click();

    const doc = loadDocuments()[0];
    expect(doc.status).toBe('aprobado');
    expect(doc.series).toBe('OC');
    expect(qs('approval-list').querySelectorAll('.approval-item')).toHaveLength(0);
    expect(qs('approval-empty').hidden).toBe(false);
  });

  it('requires a motive before rejecting a request', () => {
    seedRequest();
    qs('nav-approvals').click();
    globalThis.prompt = vi.fn(() => '');
    qs('approval-list').querySelector('.approval-reject').click();

    expect(qs('error-approval').textContent).toMatch(/motivo/);
    expect(loadDocuments()[0].status).toBe(PENDING_STATUS);

    globalThis.prompt = vi.fn(() => 'Sin presupuesto');
    qs('approval-list').querySelector('.approval-reject').click();
    expect(loadDocuments()[0].status).toBe('cancelado');
  });
});

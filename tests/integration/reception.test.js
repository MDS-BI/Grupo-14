import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { setActiveConfig, userConfig } from '../../src/module-config.js';
import { addEntity, addDocument, loadDocuments, loadRecepciones } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

function seedOrder(description = 'Monitor'){
  const entity = addEntity({ name: 'Acme', code: 'AC-001', categoriaProveedor: 'Materias primas' });
  return addDocument({
    entityId: entity.entity_id,
    series: 'OC',
    folio: 1,
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    status: 'aprobado',
    tipoDocumento: 'Orden de Compra',
    fechaEmision: '2026-08-01',
    lineasDetalle: [
      { producto_id: 'P-1', descripcion: description, cantidad: 10, unidadMedida: 'unidades', precioUnitario: 100 },
      { producto_id: 'P-2', descripcion: 'Cable', cantidad: 5, unidadMedida: 'unidades', precioUnitario: 20 }
    ]
  });
}

function selectOrder(doc){
  const select = qs('reception-document');
  select.value = doc.id;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  qs('reception-date').value = '2026-08-03';
}

function setQuantities(values){
  const rows = [...document.querySelectorAll('#reception-lines .reception-line')];
  rows.forEach((row, index) => {
    row.querySelector('.reception-cantidad').value = String(values[index] || 0);
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
  w.scrollTo = vi.fn();
  w.localStorage.clear();
  vi.resetModules();
  const { boot } = await import('../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('User Story 6 - product reception', () => {
  it('records partial and complete receptions and updates the order status', () => {
    const doc = seedOrder();
    qs('nav-reception').click();
    expect(qs('view-reception').hidden).toBe(false);
    selectOrder(doc);
    setQuantities([4, 0]);
    qs('reception-submit').click();

    expect(loadRecepciones()).toHaveLength(1);
    expect(loadDocuments()[0].status).toBe('aprobado');

    setQuantities([6, 5]);
    qs('reception-submit').click();

    expect(loadRecepciones()).toHaveLength(2);
    expect(loadDocuments()[0].status).toBe('recibido');
    expect(qs('reception-history').textContent).toContain('2026-08-03');
  });

  it('shows pending and accumulated quantities per line', () => {
    const doc = seedOrder();
    qs('nav-reception').click();
    selectOrder(doc);
    const first = qs('reception-lines').querySelector('.reception-line');
    expect(first.textContent).toContain('solicitado: 10');
    expect(first.textContent).toContain('recibido: 0');
    expect(first.textContent).toContain('pendiente: 10');
  });

  it('escapes line descriptions from storage', () => {
    const doc = seedOrder('<img src=x onerror="alert(1)">');
    qs('nav-reception').click();
    selectOrder(doc);
    expect(qs('reception-lines').querySelector('img')).toBeNull();
    expect(qs('reception-lines').textContent).toContain('<img');
  });
});

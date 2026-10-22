import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, loadDocuments } from '../../src/storage.js';

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

function fillDocument({ currency = 'USD', tipoCambio = '17.55', fechaEmision = '2026-08-01' } = {}){
  const entity = addEntity({ name: 'Acme', code: 'AC-001' });
  qs('nav-documents').click();
  qs('document-entity').value = entity.entity_id;
  qs('series').value = 'OC';
  qs('folio').value = '2045';
  qs('startDate').value = '2026-08-01';
  qs('endDate').value = '2026-08-05';
  qs('subtotal').value = '1000';
  qs('totalAmount').value = '1000';
  qs('currency').value = currency;
  qs('cf-tipoDocumento').value = 'Orden de Compra';
  qs('cf-tipoCambio').value = tipoCambio;
  qs('cf-fechaEmision').value = fechaEmision;
  qs('document-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  return entity;
}

describe('Punto 6 - divisas y tipos de cambio en los documentos de compra', () => {
  it('declara el tipo de cambio como número y la fecha de emisión como fecha obligatoria', () => {
    qs('nav-documents').click();
    expect(qs('cf-tipoCambio').getAttribute('type')).toBe('number');
    expect(qs('cf-fechaEmision').getAttribute('type')).toBe('date');
    expect(qs('error-cf-fechaEmision')).not.toBeNull();
  });

  it('congela el tipo de cambio y la fecha de emisión junto con la moneda del documento', () => {
    fillDocument();
    const saved = loadDocuments()[0];
    expect(saved.currency).toBe('USD');
    expect(saved.tipoCambio).toBe(17.55);
    expect(saved.fechaEmision).toBe('2026-08-01');
  });

  it('exige la fecha de emisión para no perder la trazabilidad del tipo de cambio', () => {
    fillDocument({ fechaEmision: '' });
    expect(loadDocuments().length).toBe(0);
    expect(qs('error-cf-fechaEmision').textContent).toContain('obligatorio');
  });

  it('rechaza un tipo de cambio que no es un número', async () => {
    const { validateDocument } = await import('../../src/storage.js');
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    const res = validateDocument({
      entityId: entity.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      tipoCambio: 'muy alto'
    });
    expect(res.valid).toBe(false);
    expect(res.errors.tipoCambio).toContain('número');
  });
});

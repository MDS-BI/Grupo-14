import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { addEntity, addDocument } from '../../src/storage.js';

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

describe('User Story 8 - search and find entities quickly', () => {
  it('shows only matching entities for a search term', () => {
    addEntity({ name: 'Acme Corp', code: 'AC-001', category: 'partner' });
    addEntity({ name: 'Globex', code: 'GL-002', category: 'supplier' });
    qs('nav-search').click();
    expect(qs('view-search').hidden).toBe(false);
    qs('search-input').value = 'acme';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Acme Corp');
    expect(qs('search-empty').hidden).toBe(true);
  });

  it('shows a clear empty state and allows trying again when nothing matches', () => {
    addEntity({ name: 'Acme', code: 'AC-001' });
    qs('nav-search').click();
    qs('search-input').value = 'zzz-nothing';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-empty').hidden).toBe(false);
    expect(qs('search-results-list').children.length).toBe(0);
    qs('search-input').value = 'Acme';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-empty').hidden).toBe(true);
    expect(qs('search-results-list').querySelectorAll('.entity-item').length).toBe(1);
  });

  it('stays prompt and accurate with hundreds of stored entities', () => {
    for(let i = 0; i < 500; i++){
      addEntity({ name: `Item ${i}`, code: `IT-${String(i).padStart(4, '0')}` });
    }
    const start = Date.now();
    qs('nav-search').click();
    qs('search-input').value = 'IT-0499';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const elapsed = Date.now() - start;
    const items = [...qs('search-results-list').querySelectorAll('.entity-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('IT-0499');
    expect(elapsed).toBeLessThan(1000);
  });

  it('searches documents by folio and justification', () => {
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    addDocument({
      entityId: entity.entity_id,
      series: 'OC',
      folio: 1001,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      justificacion: 'Compra de insumos críticos'
    });
    qs('nav-search').click();
    qs('doc-search-input').value = 'insumos';
    qs('doc-search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    const items = [...qs('doc-search-results-list').querySelectorAll('.document-item')];
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Compra de insumos críticos');
    expect(qs('doc-search-empty').hidden).toBe(true);
  });

  it('keeps search results in sync with create and delete actions', () => {
    qs('nav-search').click();
    expect(qs('search-empty').hidden).toBe(false);
    addEntity({ name: 'Later Entity', code: 'LT-9' });
    qs('nav-dashboard').click();
    qs('nav-search').click();
    qs('search-input').value = 'later';
    qs('search-input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(qs('search-results-list').querySelectorAll('.entity-item').length).toBe(1);
  });
});

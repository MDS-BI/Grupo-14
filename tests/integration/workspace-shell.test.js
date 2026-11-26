import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';
import { addEntity, addDocument, loadEntities, loadDocuments } from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');
const css = fs.readFileSync(fileURLToPath(new URL('../../src/styles.css', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

const brandedConfig = {
  moduleName: 'Sales Suite',
  theme: { accentColor: '#0f62fe' }
};

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
});

afterEach(() => {
  dom.window.close();
});

async function bootWith(configOverride){
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
}

describe('User Story 13 - branded ERP workspace shell', () => {
  it('shows a top bar with a derived SVG logo and the module name on every screen', async () => {
    await bootWith(brandedConfig);
    expect(qs('logo-mark').querySelector('svg')).not.toBeNull();
    expect(qs('brand-name').textContent).toBe('Sales Suite');

    qs('nav-entities').click();
    expect(qs('logo-mark').querySelector('svg')).not.toBeNull();

    qs('nav-documents').click();
    qs('nav-search').click();
    expect(qs('logo-mark').querySelector('svg')).not.toBeNull();
    expect(document.querySelector('.topbar .brand')).not.toBeNull();
  });

  it('derives the monogram letters from the module name', async () => {
    await bootWith(brandedConfig);
    const text = qs('logo-mark').querySelector('svg text').textContent;
    expect(text).toBe('SS');
  });

  it('offers sidebar module buttons using configured terminology', async () => {
    await bootWith(brandedConfig);
    expect(qs('nav-dashboard-label').textContent).toBe('Panel');
    expect(qs('nav-entities-label').textContent).toBe('Entidades');
    expect(qs('nav-documents-label').textContent).toBe('Documentos');
    expect(qs('nav-search-label').textContent).toBe('Búsqueda');
    expect(document.querySelectorAll('.nav-module').length).toBe(4);
  });

  it('uses remapped terms on the sidebar for tailored modules', async () => {
    await bootWith({
      moduleName: 'Ventas',
      labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' }
    });
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Pedidos de Venta');
  });

  it('keeps every module button labeled for accessible icon-rail collapse', async () => {
    await bootWith(undefined);
    document.querySelectorAll('.nav-module').forEach(btn => {
      expect(btn.querySelector('.nav-label')).not.toBeNull();
      expect(btn.querySelector('.nav-label').textContent.length).toBeGreaterThan(0);
    });
  });

  it('highlights the active module while navigating between all screens', async () => {
    await bootWith(undefined);
    const activeModule = () => document.querySelector('.nav-module[aria-current="page"]').dataset.module;

    expect(activeModule()).toBe('dashboard');

    qs('nav-entities').click();
    expect(activeModule()).toBe('entities');
    expect(qs('view-entities').hidden).toBe(false);

    qs('nav-documents').click();
    expect(activeModule()).toBe('documents');
    expect(qs('view-documents').hidden).toBe(false);

    qs('nav-search').click();
    expect(activeModule()).toBe('search');
    expect(qs('view-search').hidden).toBe(false);

    qs('nav-dashboard').click();
    expect(activeModule()).toBe('dashboard');
    expect(qs('view-dashboard').hidden).toBe(false);
  });

  it('preserves all stored data while navigating between modules', async () => {
    await bootWith(undefined);
    const entity = addEntity({ name: 'Acme', code: 'AC-001' });
    addDocument({ entityId: entity.entity_id, folio: 1001, startDate: '2026-08-01', endDate: '2026-08-05' });

    qs('nav-entities').click();
    qs('nav-documents').click();
    qs('nav-search').click();
    qs('nav-dashboard').click();

    expect(loadEntities().length).toBe(1);
    expect(loadDocuments().length).toBe(1);
    expect(loadEntities()[0].name).toBe('Acme');
  });

  it('applies the configured accent color to the document root', async () => {
    await bootWith(brandedConfig);
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#0f62fe');
  });

  it('falls back to the default accent when the color is invalid', async () => {
    await bootWith({ moduleName: 'X', theme: { accentColor: 'not-a-color' } });
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#2563eb');
  });

  it('collapses to an icon rail on narrow windows while keeping module names in the accessibility tree', async () => {
    await bootWith(undefined);
    Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 900 });
    dom.window.dispatchEvent(new dom.window.Event('resize'));

    const narrowBlock = css.slice(
      css.indexOf('@media (max-width: 1180px)'),
      css.indexOf('@media (max-width: 1024px)')
    );
    expect(narrowBlock).toContain('--sidebar-w: 76px');
    expect(narrowBlock).toContain('.nav-label');
    expect(narrowBlock).toContain('clip: rect(0 0 0 0)');

    const nav = document.querySelector('.side-nav');
    expect(nav.getAttribute('aria-label')).toBe('Módulos');

    const buttons = [...document.querySelectorAll('.nav-module, .nav-module-extra')];
    expect(buttons).toHaveLength(8);
    buttons.forEach(btn => {
      expect(btn.querySelector('svg.i')).not.toBeNull();
      const label = btn.querySelector('.nav-label');
      expect(label).not.toBeNull();
      expect(label.textContent.trim().length).toBeGreaterThan(0);
      expect(label.hasAttribute('hidden')).toBe(false);
      expect(label.getAttribute('aria-hidden')).toBeNull();
      expect(btn.textContent).toContain(label.textContent.trim());
    });
  });

  it('keeps every module icon operable and marks the active one with ARIA in a narrow window', async () => {
    await bootWith(undefined);
    Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: 900 });
    dom.window.dispatchEvent(new dom.window.Event('resize'));

    const views = {
      dashboard: 'view-dashboard',
      entities: 'view-entities',
      documents: 'view-documents',
      search: 'view-search',
      requisitions: 'view-requisitions',
      approvals: 'view-approvals',
      receptions: 'view-receptions',
      users: 'view-users'
    };

    for(const [module, viewId] of Object.entries(views)){
      const btn = document.querySelector(`.nav-module[data-module="${module}"], .nav-module-extra[data-module="${module}"]`);
      expect(btn).not.toBeNull();
      expect(btn.querySelector('svg.i')).not.toBeNull();
      btn.click();
      expect(qs(viewId).hidden).toBe(false);
      expect(btn.getAttribute('aria-current')).toBe('page');
      expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    }
  });
});

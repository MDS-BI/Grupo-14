import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { normalizeConfig } from '../../src/module-config.js';

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
});

afterEach(() => {
  dom.window.close();
});

async function bootWith(configOverride){
  vi.resetModules();
  const { initApp } = await import('../../src/app.js');
  await initApp(normalizeConfig(configOverride));
  const { getConfig, userConfig, applyTotalesToCabecera } = await import('../../src/module-config.js');
  const { addEntity, validateEntity, validateDocument } = await import('../../src/storage.js');
  return { getConfig, userConfig, applyTotalesToCabecera, addEntity, validateEntity, validateDocument };
}

describe('User Story 6 - relabel screens from configuration', () => {
  it('shows default Entidad/Documento terms everywhere when no mappings are provided', async () => {
    await bootWith(undefined);
    expect(qs('brand-name').textContent).toBe('Módulo Base ERP');
    expect(qs('nav-entities-label').textContent).toBe('Entidades');
    expect(qs('nav-documents-label').textContent).toBe('Documentos');
    expect(qs('action-new-entity-title').textContent).toBe('Nueva Entidad');
    qs('nav-entities').click();
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Entidad');
    expect(qs('delete-entity').textContent).toBe('Eliminar la entidad seleccionada');
    qs('nav-search').click();
    expect(qs('search-view-heading').textContent).toBe('Buscar Entidades');
  });

  it('uses configured terms on every screen without altering navigation behavior', async () => {
    await bootWith({
      moduleName: 'Ventas',
      labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido de Venta', documents: 'Pedidos de Venta' }
    });
    expect(document.title).toBe('Ventas');
    expect(qs('brand-name').textContent).toBe('Ventas');
    expect(qs('dashboard-heading').textContent).toBe('Ventas');
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Pedidos de Venta');
    expect(qs('action-new-entity-title').textContent).toBe('Nuevo Cliente');
    expect(qs('action-new-document-title').textContent).toBe('Nuevo Pedido de Venta');

    qs('nav-entities').click();
    expect(qs('entities-view-heading').textContent).toBe('Clientes');
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Cliente');
    expect(qs('edit-entity-heading').textContent).toBe('Editar o eliminar el cliente');
    expect(qs('delete-entity').textContent).toBe('Eliminar el cliente seleccionado');

    qs('nav-documents').click();
    expect(qs('documents-view-heading').textContent).toBe('Pedidos de Venta');
    expect(qs('document-form-heading').textContent).toBe('Agregar / Editar Pedido de Venta');
    expect(qs('edit-document-heading').textContent).toBe('Editar o eliminar el pedido de venta');
    expect(qs('delete-document').textContent).toBe('Eliminar el pedido de venta seleccionado');

    qs('nav-search').click();
    expect(qs('search-view-heading').textContent).toBe('Buscar Clientes');
    expect(qs('search-empty').textContent).toContain('coincidencias');
  });

  it('keeps navigation behavior unchanged after relabeling', async () => {
    await bootWith({ labels: { entity: 'Producto', entities: 'Productos', document: 'Orden', documents: 'Órdenes' } });
    qs('nav-entities').click();
    expect(qs('view-entities').hidden).toBe(false);
    qs('nav-documents').click();
    expect(qs('view-entities').hidden).toBe(true);
    expect(qs('view-documents').hidden).toBe(false);
    qs('nav-dashboard').click();
    expect(qs('view-dashboard').hidden).toBe(false);
  });

  it('derives the logo monogram from the configured module name', async () => {
    await bootWith({ moduleName: 'Warehouse Pro' });
    expect(qs('logo-mark').querySelector('svg text').textContent).toBe('WP');
  });

  it('adapta por completo el módulo desde un único objeto de configuración sin tocar archivos centrales', async () => {
    const centralBefore = await import('../../src/module-config.js');
    const centralSnapshot = JSON.stringify(centralBefore.userConfig);
    const tailored = {
      moduleName: 'Taller de Ventas',
      labels: { entity: 'Cliente', entities: 'Clientes', document: 'Pedido', documents: 'Pedidos' },
      customFields: [
        { target: 'entity', key: 'segmento', label: 'Segmento', type: 'select', options: ['PYMES', 'Empresas'], required: true },
        { target: 'document', key: 'canal', label: 'Canal', type: 'select', options: ['Web', 'Presencial'], required: true }
      ],
      justificacion: { requiredFor: ['Pedido'] },
      statusLifecycle: {
        statuses: ['Borrador', 'Confirmado'],
        transitions: { Borrador: ['Confirmado'], Confirmado: [] }
      },
      lineasDetalle: {
        label: 'Ítems',
        unidadesMedida: ['piezas', 'cajas'],
        maxPorcentajeDescuento: 25,
        camposExtra: [{ key: 'color', label: 'Color', type: 'text' }]
      },
      theme: { accentColor: '#7c3aed' },
      taxRate: 0.16,
      monedaLocal: 'USD'
    };

    const resolved = normalizeConfig(tailored);
    expect(resolved.errors).toEqual([]);
    const { getConfig, userConfig, applyTotalesToCabecera, addEntity, validateEntity, validateDocument } = await bootWith(tailored);

    expect(JSON.stringify(userConfig)).toBe(centralSnapshot);
    expect(userConfig.moduleName).not.toBe(tailored.moduleName);
    expect(getConfig()).toMatchObject({ moduleName: 'Taller de Ventas', taxRate: 0.16, monedaLocal: 'USD' });
    expect(getConfig().lineasDetalle).toMatchObject({
      label: 'Ítems',
      unidadesMedida: ['piezas', 'cajas'],
      maxPorcentajeDescuento: 25,
      camposExtra: [{ key: 'color', label: 'Color', type: 'text' }]
    });
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#7c3aed');

    expect(document.title).toBe('Taller de Ventas');
    expect(qs('brand-name').textContent).toBe('Taller de Ventas');
    expect(qs('logo-mark').querySelector('svg text').textContent).toBe('TV');
    expect(qs('dashboard-heading').textContent).toBe('Taller de Ventas');
    expect(qs('dashboard-subtitle').textContent).toContain('clientes');
    expect(qs('dashboard-subtitle').textContent).toContain('pedidos');
    expect(qs('action-new-entity-title').textContent).toBe('Nuevo Cliente');
    expect(qs('action-new-document-title').textContent).toBe('Nuevo Pedido');
    expect(qs('nav-entities-label').textContent).toBe('Clientes');
    expect(qs('nav-documents-label').textContent).toBe('Pedidos');

    qs('nav-entities').click();
    expect(qs('entities-view-heading').textContent).toBe('Clientes');
    expect(qs('entity-form-heading').textContent).toBe('Agregar / Editar Cliente');
    expect(qs('edit-entity-heading').textContent).toBe('Editar o eliminar el cliente');
    expect(qs('delete-entity').textContent).toBe('Eliminar el cliente seleccionado');
    expect(qs('cf-segmento').tagName).toBe('SELECT');
    expect([...qs('cf-segmento').options].map(o => o.value)).toEqual(['', 'PYMES', 'Empresas']);
    expect(qs('cf-segmento').previousElementSibling.textContent).toContain('Segmento *');

    const entityCheck = validateEntity({ name: 'Cliente', code: 'C-1' });
    expect(entityCheck.valid).toBe(false);
    expect(entityCheck.errors.segmento).toContain('obligatorio');
    const saved = addEntity({ name: 'Cliente', code: 'C-1', segmento: 'PYMES' });

    qs('nav-documents').click();
    expect(qs('documents-view-heading').textContent).toBe('Pedidos');
    expect(qs('document-form-heading').textContent).toBe('Agregar / Editar Pedido');
    expect(qs('edit-document-heading').textContent).toBe('Editar o eliminar el pedido');
    expect(qs('delete-document').textContent).toBe('Eliminar el pedido seleccionado');
    expect([...qs('status').options].map(o => o.value)).toEqual(['', 'Borrador', 'Confirmado']);
    expect([...qs('cf-canal').options].map(o => o.value)).toEqual(['', 'Web', 'Presencial']);

    const documentCheck = validateDocument({
      entityId: saved.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      tipoDocumento: 'Pedido'
    });
    expect(documentCheck.errors.canal).toContain('obligatorio');
    expect(documentCheck.errors.justificacion).toContain('obligatoria');
    expect(documentCheck.errors.startDate).toBeUndefined();
    expect(validateDocument({
      entityId: saved.entity_id,
      folio: 1,
      startDate: '2026-08-01',
      endDate: '2026-08-05',
      tipoDocumento: 'Pedido',
      canal: 'Web',
      justificacion: 'Motivo configurado'
    }).valid).toBe(true);

    const totals = applyTotalesToCabecera({
      lineasDetalle: [{ cantidad: 1, precioUnitario: 100, subtotalLinea: 100 }],
      discount: 0
    }, getConfig().taxRate);
    expect(totals.taxAmount).toBe(16);
    expect(totals.totalAmount).toBe(116);
  });
});

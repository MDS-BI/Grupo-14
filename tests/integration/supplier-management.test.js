import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import {
  addEntity, loadEntities, activeEntities, setEntityActive,
  assertEntityCanDeactivate, addDocument, approveDocument, patchDocument
} from '../../src/storage.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;

function qs(id){ return document.getElementById(id); }

function submitEntityForm(){
  qs('entity-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

function selectEntityForEdit(id){
  const select = qs('edit-entity');
  select.value = id;
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function completeProvider(overrides = {}){
  return {
    name: 'Proveedor Completo',
    code: 'PV-COM',
    taxId: '12.345.678-5',
    categoriaProveedor: 'Servicios',
    paymentTerms: '30 días',
    creditLimit: 50000,
    ...overrides
  };
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
  const { boot } = await import('../../src/app.js');
  await boot();
});

afterEach(() => {
  dom.window.close();
});

describe('T110 - gestión del maestro de proveedores', () => {
  it('crea, edita y elimina proveedores desde el formulario', () => {
    qs('nav-entities').click();
    qs('name').value = 'Ferretería Central';
    qs('code').value = 'PV-001';
    qs('taxId').value = '12.345.678-5';
    qs('cf-categoriaProveedor').value = 'Servicios';
    qs('paymentTerms').value = '30 días';
    qs('creditLimit').value = '50000';
    submitEntityForm();

    let saved = loadEntities()[0];
    expect(saved.name).toBe('Ferretería Central');
    expect(saved.taxId).toBe('12.345.678-5');
    expect(saved.categoriaProveedor).toBe('Servicios');

    selectEntityForEdit(saved.id);
    qs('name').value = 'Ferretería Central SpA';
    qs('cf-categoriaProveedor').value = 'Equipos';
    submitEntityForm();
    saved = loadEntities()[0];
    expect(saved.name).toBe('Ferretería Central SpA');
    expect(saved.categoriaProveedor).toBe('Equipos');

    selectEntityForEdit(saved.id);
    qs('delete-entity').click();
    expect(loadEntities()).toHaveLength(0);
  });

  it('excluye proveedores inactivos del selector de cotización', () => {
    const active = addEntity(completeProvider());
    const inactive = addEntity(completeProvider({
      name: 'Proveedor Inactivo',
      code: 'PV-INA',
      taxId: '96.854.120-K'
    }));
    expect(activeEntities().map(e => e.id)).toEqual([active.id, inactive.id]);

    setEntityActive(inactive.id, false);
    expect(activeEntities().map(e => e.id)).toEqual([active.id]);

    qs('nav-requisitions').click();
    const options = [...qs('quotation-entity').options].map(o => o.textContent);
    expect(options).toContain(active.name);
    expect(options).not.toContain(inactive.name);
  });

  it('no permite desactivar un proveedor con OC emitida o recibida parcialmente', () => {
    const entity = addEntity(completeProvider({ creditLimit: 100000 }));
    const doc = addDocument({
      entityId: entity.entity_id,
      folio: 1001,
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      status: 'Aprobada',
      lineasDetalle: [
        { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 2, unidadMedida: 'cajas', precioUnitario: 1000 }
      ]
    });
    const issued = approveDocument(doc.id);
    expect(issued.status).toBe('Emitida');

    expect(() => assertEntityCanDeactivate(entity.id)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);
    expect(() => setEntityActive(entity.id, false)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);
    expect(activeEntities().map(e => e.id)).toContain(entity.id);

    patchDocument(doc.id, { status: 'Recibida parcialmente' });
    expect(() => assertEntityCanDeactivate(entity.id)).toThrow(/Órdenes de Compra emitidas o recibidas parcialmente/);

    patchDocument(doc.id, { status: 'Recibida' });
    expect(() => assertEntityCanDeactivate(entity.id)).not.toThrow();
    expect(setEntityActive(entity.id, false).estado).toBe('Inactivo');
    expect(activeEntities().map(e => e.id)).not.toContain(entity.id);
  });
});

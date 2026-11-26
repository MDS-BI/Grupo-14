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

describe('T137 - catálogo en solicitudes de compra', () => {
  it('complete una línea con los datos devueltos por el catálogo', () => {
    storage.addCatalogItem({
      code: 'LAP-01', producto_id: 'LAP-01', descripcion: 'Laptop 14 pulgadas',
      unidadMedida: 'unidades', precioReferencia: 15000
    });
    const item = storage.findCatalogItem('lap-01');
    expect(item).toBeDefined();

    app.applySession(ROLE_FIXTURES.solicitante);
    qs('nav-requisitions').click();
    setLine(0, 'descripcion', item.descripcion);
    setLine(0, 'cantidad', '2');
    setLine(0, 'unidadMedida', item.unidadMedida);
    setLine(0, 'precioEstimado', String(item.precioReferencia));
    qs('requisition-justification').value = 'Renovación del equipo de soporte';
    submit(qs('requisition-form'));

    const saved = storage.loadRequisitions()[0];
    expect(saved.lineasDetalle[0]).toMatchObject({
      descripcion: 'Laptop 14 pulgadas',
      cantidad: 2,
      unidadMedida: 'unidades',
      precioEstimado: 15000
    });
    expect(storage.requisitionTotal(saved)).toBe(30000);
  });

  it('excluya productos inactivos del catálogo', () => {
    const item = storage.addCatalogItem({
      code: 'MOB-01', producto_id: 'MOB-01', descripcion: 'Silla oficina',
      unidadMedida: 'unidades', precioReferencia: 5000
    });
    expect(storage.findCatalogItem('MOB-01').descripcion).toBe('Silla oficina');

    storage.updateCatalogItem(item.id, { active: false, revision: item.revision });
    expect(storage.findCatalogItem('MOB-01')).toBeUndefined();
  });

  it('advierta productos duplicados en las líneas de la solicitud', () => {
    expect(storage.duplicateCatalogRequests([
      { producto_id: 'LAP-01' },
      { producto_id: 'lap-01' },
      { producto_id: 'MOB-01' }
    ])).toEqual(['LAP-01']);
    expect(storage.duplicateCatalogRequests([
      { producto_id: 'LAP-01' },
      { producto_id: 'MOB-01' }
    ])).toEqual([]);
  });
});

describe('Fase 33 - visibilidad de solicitudes por rol', () => {
  function seed(user, department, justification){
    app.applySession(user);
    return storage.addRequisition({
      department,
      justification,
      lineasDetalle: [{ descripcion: 'Monitor', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 1000 }]
    });
  }

  it('el solicitante no ve solicitudes de otros usuarios', () => {
    const own = seed(ROLE_FIXTURES.solicitante, 'TI', 'Solicitud propia del solicitante');
    seed(ROLE_FIXTURES.admin, 'Compras', 'Solicitud ajena del administrador');

    app.applySession(ROLE_FIXTURES.solicitante);
    qs('nav-requisitions').click();
    expect(qs('requisitions-list').textContent).toContain('Solicitud propia del solicitante');
    expect(qs('requisitions-list').textContent).not.toContain('Solicitud ajena del administrador');
    expect(storage.listRequisitionsForUser(ROLE_FIXTURES.solicitante).map(r => r.id)).toEqual([own.id]);
  });

  it('el aprobador ve solo las solicitudes de su departamento', () => {
    seed(ROLE_FIXTURES.aprobador, 'TI', 'Solicitud TI del aprobador');
    seed(ROLE_FIXTURES.admin, 'Compras', 'Solicitud de Compras ajena');

    app.applySession(ROLE_FIXTURES.aprobador);
    qs('nav-requisitions').click();
    expect(qs('requisitions-list').textContent).toContain('Solicitud TI del aprobador');
    expect(qs('requisitions-list').textContent).not.toContain('Solicitud de Compras ajena');
    expect(storage.listRequisitionsForUser(ROLE_FIXTURES.aprobador)).toHaveLength(1);
  });

  it('el administrador ve todas las solicitudes', () => {
    seed(ROLE_FIXTURES.solicitante, 'TI', 'Solicitud del solicitante');
    seed(ROLE_FIXTURES.aprobador, 'TI', 'Solicitud del aprobador');
    seed(ROLE_FIXTURES.admin, 'Compras', 'Solicitud del administrador');

    app.applySession(ROLE_FIXTURES.admin);
    qs('nav-requisitions').click();
    expect(qs('requisitions-list').textContent).toContain('Solicitud del solicitante');
    expect(qs('requisitions-list').textContent).toContain('Solicitud del aprobador');
    expect(qs('requisitions-list').textContent).toContain('Solicitud del administrador');
    expect(storage.listRequisitionsForUser(ROLE_FIXTURES.admin)).toHaveLength(3);
  });

  it('el encargado de compras ve solo las solicitudes aprobadas', () => {
    const approved = seed(ROLE_FIXTURES.solicitante, 'TI', 'Solicitud aprobada');
    seed(ROLE_FIXTURES.admin, 'Compras', 'Solicitud pendiente');
    app.applySession(ROLE_FIXTURES.admin);
    storage.approveRequisition(approved.id, { revision: approved.revision });

    app.applySession(ROLE_FIXTURES.compras);
    qs('nav-requisitions').click();
    expect(qs('requisitions-list').textContent).toContain('Solicitud aprobada');
    expect(qs('requisitions-list').textContent).not.toContain('Solicitud pendiente');
  });

  it('deriva departamento y partida del perfil y los deja de solo lectura', () => {
    const user = { ...ROLE_FIXTURES.solicitante, department: 'TI' };
    app.applySession(user);
    qs('nav-requisitions').click();
    expect(qs('requisition-department').value).toBe('TI');
    expect(qs('requisition-department').readOnly).toBe(true);
    expect(qs('requisition-budget-line').readOnly).toBe(true);

    qs('requisition-justification').value = 'Equipos para el área TI';
    setLine(0, 'descripcion', 'Laptop');
    setLine(0, 'cantidad', '1');
    setLine(0, 'precioEstimado', '1000');
    submit(qs('requisition-form'));

    const saved = storage.loadRequisitions()[0];
    expect(saved.department).toBe('TI');
    expect(saved.budgetLine).toBe(storage.costCenterForDepartment('TI'));
  });
});

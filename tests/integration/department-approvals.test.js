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

describe('T134 - enrutamiento automático al jefe aprobador', () => {
  async function api(){
    return import('../../src/storage.js');
  }

  function requestIn(department, storage){
    return storage.addRequisition({
      department,
      justification: `Compra del área ${department}`,
      lineasDetalle: [{ descripcion: 'Artículo', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 100 }]
    });
  }

  it('muestra y aprueba la solicitud solo al jefe asignado al departamento', async () => {
    const app = await import('../../src/app.js');
    const storage = await api();
    const { resetSession } = await import('../../src/auth.js');
    try{
      const jefe = storage.addUser({ username: 'jefe.ti', name: 'Jefe TI', role: 'aprobador', department: 'TI', active: true });
      const otro = storage.addUser({ username: 'jefe.ops', name: 'Jefe Ops', role: 'aprobador', department: 'Operaciones', active: true });
      storage.addDepartment({ name: 'TI', code: 'TI', approverId: jefe.id });
      const request = requestIn('TI', storage);

      app.applySession(otro);
      qs('nav-approvals').click();
      expect(qs('approvals-list').textContent).not.toContain(request.folio);

      app.applySession(jefe);
      qs('nav-approvals').click();
      expect(qs('approvals-list').textContent).toContain(request.folio);
      qs('approvals-list').querySelector('button').click();
      qs('approve-requisition').click();
      expect(loadRequisitions().find(r => r.id === request.id).status).toBe(REQUISITION_STATUS.APPROVED);
    }finally{
      resetSession();
    }
  });

  it('impide decidir a otro aprobador del mismo departamento', async () => {
    const storage = await api();
    const { setSession, resetSession } = await import('../../src/auth.js');
    try{
      const jefe = storage.addUser({ username: 'jefe', name: 'Jefe', role: 'aprobador', department: 'TI', active: true });
      const suplente = storage.addUser({ username: 'suplente', name: 'Suplente', role: 'aprobador', department: 'TI', active: true });
      storage.addDepartment({ name: 'TI', code: 'TI', approverId: jefe.id });
      const request = requestIn('TI', storage);

      setSession(suplente);
      expect(() => storage.approveRequisition(request.id)).toThrow(/jefe aprobador/);
      setSession(jefe);
      expect(storage.approveRequisition(request.id).status).toBe(REQUISITION_STATUS.APPROVED);
      expect(storage.loadAuditEvents().some(e => e.entityId === request.id && e.accion === 'aprobar')).toBe(true);
    }finally{
      resetSession();
    }
  });

  it('recupera el departamento de la sesión y lo conserva en la solicitud', async () => {
    const storage = await api();
    const { setSession, resetSession } = await import('../../src/auth.js');
    try{
      const requester = storage.addUser({ username: 'sol', name: 'Sol', role: 'solicitante', department: 'Compras', active: true });
      setSession(requester);
      const request = storage.addRequisition({
        department: requester.department,
        justification: 'Renovación de equipos',
        lineasDetalle: [{ descripcion: 'Laptop', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 1000 }]
      });
      expect(request.department).toBe('Compras');
      expect(storage.budgetForDepartment('Compras').used).toBe(1000);
      expect(storage.pendingRequisitionsForDepartment('Compras').map(r => r.id)).toEqual([request.id]);
    }finally{
      resetSession();
    }
  });
});

// T039 en la interfaz: bandeja filtrada por departamento, usuario sin
// departamento y cambio de sesión con el selector de usuario.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let app;
let storage;

function qs(id){ return document.getElementById(id); }

function addRequisition(department){
  return storage.addRequisition({
    department,
    justification: `Compra del área ${department}`,
    lineasDetalle: [{ descripcion: 'Artículo', cantidad: 1, unidadMedida: 'unidades', precioEstimado: 100 }]
  });
}

function listedText(){
  return Array.from(qs('approvals-list').querySelectorAll('button')).map(b => b.textContent).join('\n');
}

function switchSession(userId){
  const select = qs('session-user');
  select.value = userId;
  select.dispatchEvent(new window.Event('change'));
}

let ti;
let ops;
let approverTi;
let approverOps;
let approverNoDept;

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
  ti = addRequisition('TI');
  ops = addRequisition('Operaciones');
  approverTi = storage.addUser({ username: 'apr.ti', name: 'Aprobador TI', role: 'aprobador', department: 'TI' });
  approverOps = storage.addUser({ username: 'apr.ops', name: 'Aprobador Ops', role: 'aprobador', department: 'Operaciones' });
  approverNoDept = storage.addUser({ username: 'apr.x', name: 'Aprobador Sin Área', role: 'aprobador' });
});

afterEach(() => {
  dom.window.close();
});

describe('T039 - bandeja de aprobación por departamento', () => {
  it('el aprobador solo ve las solicitudes de su departamento', () => {
    app.applySession(approverTi);
    qs('nav-approvals').click();
    expect(listedText()).toContain(ti.folio);
    expect(listedText()).not.toContain(ops.folio);
  });

  it('el administrador ve las solicitudes de todos los departamentos', () => {
    app.applySession(null);
    qs('nav-approvals').click();
    expect(listedText()).toContain(ti.folio);
    expect(listedText()).toContain(ops.folio);
  });

  it('un aprobador sin departamento ve la bandeja vacía y un aviso', () => {
    app.applySession(approverNoDept);
    qs('nav-approvals').click();
    expect(qs('approvals-list').children).toHaveLength(0);
    expect(qs('approvals-empty').hidden).toBe(false);
    expect(qs('error-approval').textContent).toMatch(/departamento/i);
  });

  it('al cambiar de sesión con el selector, la bandeja se recalcula para el nuevo aprobador', () => {
    app.applySession(approverTi);
    qs('nav-approvals').click();
    qs('approvals-list').querySelector('button').click();
    expect(qs('approval-detail').textContent).toContain('Compra del área TI');

    switchSession(approverOps.id);
    qs('nav-approvals').click();
    expect(listedText()).toContain(ops.folio);
    expect(listedText()).not.toContain(ti.folio);
    expect(qs('approval-detail').textContent).not.toContain('Compra del área TI');
  });

  it('tras cambiar de sesión, el detalle abierto por otro aprobador no permite aprobar', () => {
    app.applySession(approverTi);
    qs('nav-approvals').click();
    qs('approvals-list').querySelector('button').click();
    const staleApprove = qs('approve-requisition');

    switchSession(approverOps.id);
    staleApprove.click();

    expect(storage.loadRequisitions().find(r => r.id === ti.id).status).toBe(storage.REQUISITION_STATUS.PENDING);
  });
});

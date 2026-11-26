import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { ROLE_FIXTURES } from '../setup/roles.js';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let app;
let storage;
let auth;

function qs(id){ return document.getElementById(id); }

function seedOrder(entrega = '2026-01-05', direccion = 'Almacén central, pasillo 4'){
  const entity = storage.addEntity({
    name: 'Proveedor Entrega', code: 'PE-1', taxId: 'RFC123456789',
    categoriaProveedor: 'Servicios', paymentTerms: 'neto 30', creditLimit: 100000
  });
  const doc = storage.addDocument({
    entityId: entity.entity_id,
    folio: 1001,
    startDate: '2026-01-01',
    endDate: '2026-01-10',
    status: storage.DOCUMENT_STATUS.APPROVED,
    tipoDocumento: 'Orden de Compra',
    fechaEmision: '2026-01-01',
    fechaEstimadaEntrega: entrega,
    direccionEntrega: direccion,
    instruccionesDespacho: 'Llamar a bodega al llegar',
    lineasDetalle: [
      { producto_id: 'SKU-1', descripcion: 'Caja', cantidad: 4, unidadMedida: 'cajas', precioUnitario: 10 }
    ]
  });
  return { entity, doc };
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
  auth = await import('../../src/auth.js');
  await app.boot();
});

afterEach(() => {
  auth.resetSession();
  dom.window.close();
});

describe('T140 - emisión y bandeja de recepción', () => {
  it('emite la orden con fecha estimada y dirección y la muestra en la bandeja', () => {
    const { doc } = seedOrder();
    const issued = storage.approveDocument(doc.id);
    expect(issued.status).toBe(storage.DOCUMENT_STATUS.ISSUED);
    expect(issued.fechaEstimadaEntrega).toBe('2026-01-05');
    expect(issued.direccionEntrega).toBe('Almacén central, pasillo 4');

    app.applySession(ROLE_FIXTURES.recepcion);
    qs('nav-receptions').click();
    expect(qs('view-receptions').hidden).toBe(false);
    expect(qs('receptions-list').textContent).toContain('OC-1001');
    expect(storage.ordersPendingReception().map(o => o.id)).toEqual([doc.id]);
  });

  it('registra una recepción parcial desde la bandeja', () => {
    const { doc } = seedOrder();
    storage.approveDocument(doc.id);
    app.applySession(ROLE_FIXTURES.recepcion);
    qs('nav-receptions').click();
    qs('receptions-list').querySelector('button').click();
    qs('reception-detail').querySelector('[data-field="cantidadRecibida"]').value = '2';
    qs('reception-submit-button').click();

    expect(storage.loadReceptions()).toHaveLength(1);
    expect(storage.loadDocuments().find(d => d.id === doc.id).status).toBe(storage.DOCUMENT_STATUS.PARTIALLY_RECEIVED);
  });
});

describe('T140 - vista imprimible', () => {
  it('muestra entrega, dirección, líneas y total con contenido escapado', () => {
    const { doc } = seedOrder('2026-01-05', '<script>alert(1)</script>');
    const printed = storage.printableDocument(doc.id);
    const parsed = new dom.window.DOMParser().parseFromString(printed, 'text/html');
    expect(parsed.querySelector('script')).toBeNull();
    expect(parsed.body.textContent).toContain('2026-01-05');
    expect(parsed.body.textContent).toContain('<script>alert(1)</script>');
    expect(parsed.body.textContent).toContain('Llamar a bodega al llegar');
    expect(parsed.querySelector('table tbody tr').textContent).toContain('Caja');
    expect(parsed.body.textContent).toContain('40');
  });

  it('refleja el cambio de fecha auditado en la vista imprimible', () => {
    const { doc } = seedOrder();
    const updated = storage.updateDocument(doc.id, {
      fechaEstimadaEntrega: '2026-01-08',
      motivoCambioEntrega: 'Reprogramación del proveedor',
      revision: doc.revision
    });
    expect(updated.fechaEstimadaEntrega).toBe('2026-01-08');
    expect(storage.auditForEntity('documento', doc.id).some(e => e.accion === 'cambiar_fecha_entrega')).toBe(true);
    expect(storage.printableDocument(doc.id)).toContain('2026-01-08');
  });
});

describe('T140 - alertas operativas de atraso', () => {
  it('cuenta órdenes vencidas y deja de contarlas al recibirlas por completo', () => {
    const { doc } = seedOrder();
    storage.approveDocument(doc.id);
    expect(storage.isOrderOverdue(storage.loadDocuments()[0], '2026-01-20')).toBe(true);
    expect(storage.overdueOrders('2026-01-20').map(d => d.id)).toContain(doc.id);
    expect(storage.dashboardMetrics('2026-01-20').overdueOrders).toBe(1);

    storage.saveDocuments(storage.loadDocuments().map(d => (
      d.id === doc.id ? { ...d, status: storage.DOCUMENT_STATUS.RECEIVED } : d
    )));
    expect(storage.overdueOrders('2026-01-20').map(d => d.id)).not.toContain(doc.id);
    expect(storage.dashboardMetrics('2026-01-20').overdueOrders).toBe(0);
  });

  it('mantiene la alerta mientras la recepción es parcial', () => {
    const { doc } = seedOrder();
    storage.approveDocument(doc.id);
    auth.setSession(ROLE_FIXTURES.recepcion);
    storage.addReception({ orderId: doc.id, lineas: [{ ordenLineaIndex: 0, cantidadRecibida: 1 }] });
    expect(storage.loadDocuments().find(d => d.id === doc.id).status).toBe(storage.DOCUMENT_STATUS.PARTIALLY_RECEIVED);
    expect(storage.overdueOrders('2026-01-20').map(d => d.id)).toContain(doc.id);
  });
});

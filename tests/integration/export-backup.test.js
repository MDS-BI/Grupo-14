import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8');

let dom;
let storage;

function qs(id){ return document.getElementById(id); }
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function collectionKeys(backup){
  return Object.keys(backup).filter((key) => key.startsWith('erp_base_module:'));
}

beforeEach(async () => {
  dom = new JSDOM(html, { url: 'http://localhost/' });
  const w = dom.window;
  globalThis.window = w;
  globalThis.document = w.document;
  globalThis.localStorage = w.localStorage;
  globalThis.alert = vi.fn();
  globalThis.confirm = vi.fn(() => true);
  w.localStorage.clear();
  vi.resetModules();
  storage = await import('../../src/storage.js');
});

afterEach(() => {
  dom.window.close();
});

function validBackup(){
  const backup = storage.createBackup();
  const [entitiesKey, documentsKey, auditKey] = ['entities', 'documents', 'audit_events']
    .map((suffix) => Object.keys(backup).find((key) => key.endsWith(`:${suffix}`)));
  collectionKeys(backup).forEach((key) => { backup[key] = []; });
  backup[entitiesKey].push({
    id: 'e-1',
    entity_id: 'prov-1',
    name: 'Proveedor Uno',
    code: 'P-1',
    taxId: '12.345.678-5'
  });
  backup[documentsKey].push({
    id: 'd-1',
    entity_id: 'prov-1',
    series: 'OC',
    folio: 1001,
    status: 'Emitida',
    createdAt: '2026-11-01T00:00:00.000Z',
    totalAmount: 100
  });
  backup[auditKey].push({
    id: 'a-1',
    tipo: 'EVENTO_DE_AUDITORIA',
    entidadTipo: 'documento',
    entidadId: 'd-1',
    accion: 'crear',
    revision: 1,
    at: '2026-11-01T00:00:00.000Z'
  });
  return backup;
}

describe('T127 - exportación CSV, vista imprimible y respaldo/restauración', () => {
  it('exporta CSV con BOM UTF-8, CRLF, encabezado y celdas escapadas', () => {
    storage.saveEntities([{ id: 'e-1', entity_id: 'prov-1', name: 'Proveedor "Alfa", S.A.', code: 'P-1' }]);
    storage.saveDocuments([
      {
        id: 'd-1', entity_id: 'prov-1', series: 'OC', folio: 1001, status: 'Emitida',
        startDate: '2026-11-01', endDate: '2026-11-30', fechaEstimadaEntrega: '2026-11-20',
        subtotal: 100, discount: 0, taxAmount: 19, totalAmount: 119
      },
      {
        id: 'd-2', entity_id: 'prov-2', series: 'OC', folio: 1002, status: 'Rechazada',
        startDate: '2026-11-01', endDate: '2026-11-30', totalAmount: 5
      }
    ]);

    const csv = storage.exportDocumentsCsv(storage.loadDocuments().filter((doc) => doc.status === 'Emitida'));
    const lines = csv.slice(1).split('\r\n');

    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).not.toContain('\n\r');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('"serie","folio","proveedor","estado","fechaInicio","fechaFin","fechaEntrega","subtotal","descuento","impuesto","total","factura","fechaPago"');
    expect(lines[1]).toContain('"Proveedor ""Alfa"", S.A."');
    expect(lines[1]).toContain('"Emitida"');
    expect(csv).not.toContain('Rechazada');
  });

  it('genera una vista imprimible con charset UTF-8 y contenido escapado', () => {
    storage.saveEntities([{ id: 'e-1', entity_id: 'prov-1', name: 'Proveedor <Seguro>', code: 'P-1' }]);
    storage.saveDocuments([{
      id: 'd-1',
      entity_id: 'prov-1',
      series: 'OC',
      folio: 1001,
      status: 'Emitida',
      fechaEstimadaEntrega: '2026-11-20',
      direccionEntrega: 'Calle & Av.',
      instruccionesDespacho: 'Llamar alportero',
      totalAmount: 119,
      lineasDetalle: [{ producto_id: 'P-1', descripcion: '<script>alert(1)</script>', cantidad: 1, unidadMedida: 'unidades', precioUnitario: 100, subtotalLinea: 100 }]
    }]);

    const htmlPrint = storage.printableDocument('d-1');
    expect(htmlPrint).toContain('<!doctype html>');
    expect(htmlPrint).toContain('<meta charset="utf-8">');
    expect(htmlPrint).toContain('OC 1001');
    expect(htmlPrint).toContain('Proveedor &lt;Seguro&gt;');
    expect(htmlPrint).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(htmlPrint).toContain('Calle &amp; Av.');
    expect(htmlPrint).toContain('Total: 119');
    expect(htmlPrint).not.toContain('<script>');
    expect(() => storage.printableDocument('inexistente')).toThrow(/Documento no encontrado/);
    expect(qs('view-documents').hidden).toBe(true);
  });

  it('crea y restaura un respaldo válido con esquema, colecciones, RUT y folios correctos', () => {
    const entity = storage.addEntity({
      name: 'Proveedor Original',
      code: 'P-1',
      taxId: '12.345.678-5',
      categoriaProveedor: 'Servicios',
      paymentTerms: 'neto 30',
      creditLimit: 100000
    });
    storage.addDocument({
      entityId: entity.entity_id,
      folio: 1001,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'Aprobada',
      totalAmount: 100,
      tipoDocumento: 'Orden de Compra'
    });

    const backup = storage.createBackup();
    expect(backup.schemaVersion).toBe(storage.SCHEMA_VERSION);
    expect(typeof backup.exportedAt).toBe('string');
    expect(collectionKeys(backup)).toHaveLength(10);
    expect(collectionKeys(backup).every((key) => Array.isArray(backup[key]))).toBe(true);
    expect(storage.validateBackup(backup)).toBe(backup);

    storage.clearAll();
    storage.saveEntities([{ id: 'temporal', entity_id: 'temporal', name: 'Temporal', code: 'T-1' }]);
    const emitted = [];
    const unsubscribe = storage.subscribeChanges((event) => emitted.push(event.domainType));
    expect(storage.restoreBackup(backup)).toBe(true);
    unsubscribe();

    expect(emitted).toContain('restore');
    expect(storage.loadEntities().map((item) => item.name)).toEqual(['Proveedor Original']);
    expect(storage.loadDocuments()).toHaveLength(1);
    expect(storage.loadAuditEvents().length).toBeGreaterThan(0);
  });

  it('valida un respaldo mínimo con RUT y folio únicos', () => {
    const backup = validBackup();
    expect(storage.validateBackup(backup)).toBe(backup);

    storage.clearAll();
    expect(storage.restoreBackup(backup)).toBe(true);
    expect(storage.loadEntities()[0].taxId).toBe('12.345.678-5');
    expect(storage.loadDocuments()[0].folio).toBe(1001);
    expect(storage.loadAuditEvents()).toHaveLength(1);
  });

  it.each([
    ['versión de esquema', (backup) => { backup.schemaVersion = storage.SCHEMA_VERSION + 1; }, /Versión de esquema/],
    ['colección ausente', (backup) => { delete backup[collectionKeys(backup)[0]]; }, /colección válida/],
    ['RUT inválido', (backup) => {
      const key = collectionKeys(backup).find((item) => item.endsWith(':entities'));
      backup[key][0].taxId = '12.345.678-9';
    }, /RUT inválido/],
    ['RUT duplicado', (backup) => {
      const key = collectionKeys(backup).find((item) => item.endsWith(':entities'));
      backup[key].push({ ...backup[key][0], id: 'e-2', entity_id: 'prov-2', code: 'P-2' });
    }, /RUT duplicados/],
    ['folio inválido', (backup) => {
      const key = collectionKeys(backup).find((item) => item.endsWith(':documents'));
      backup[key][0].folio = 'abc';
    }, /folios inválidos/],
    ['folio duplicado', (backup) => {
      const key = collectionKeys(backup).find((item) => item.endsWith(':documents'));
      backup[key].push({ ...backup[key][0], id: 'd-2' });
    }, /folios duplicados/],
    ['documento huérfano', (backup) => {
      const key = collectionKeys(backup).find((item) => item.endsWith(':documents'));
      backup[key][0].entity_id = 'proveedor-inexistente';
    }, /huérfanos/]
  ])('rechaza respaldos con %s sin mezclar datos', (label, corrupt, message) => {
    const backup = validBackup();
    storage.restoreBackup(backup);
    const before = {
      entities: clone(storage.loadEntities()),
      documents: clone(storage.loadDocuments()),
      audit: clone(storage.loadAuditEvents())
    };

    corrupt(backup);
    expect(() => storage.restoreBackup(backup)).toThrow(message);
    expect(storage.loadEntities()).toEqual(before.entities);
    expect(storage.loadDocuments()).toEqual(before.documents);
    expect(storage.loadAuditEvents()).toEqual(before.audit);
  });
});

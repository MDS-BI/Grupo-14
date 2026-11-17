import { describe, it, expect, beforeEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import {
  addEntity, addDocument, loadDocuments, loadRecepciones, addRecepcion,
  validateRecepcion, pendingQuantityForLine, receivedQuantityForLine
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

function seedOrder(status = 'aprobado'){
  const entity = addEntity({ name: 'Acme', code: 'AC-001' });
  return addDocument({
    entityId: entity.entity_id,
    series: 'OC',
    folio: 1,
    startDate: '2026-08-01',
    endDate: '2026-08-05',
    status,
    lineasDetalle: [
      { producto_id: 'P-1', descripcion: 'Monitor', cantidad: 10, unidadMedida: 'unidades', precioUnitario: 100 },
      { producto_id: 'P-2', descripcion: 'Cable', cantidad: 5, unidadMedida: 'unidades', precioUnitario: 20 }
    ]
  });
}

beforeEach(() => {
  store.clear();
  setActiveConfig({ tasaImpuesto: 0.16 });
});

describe('reception validation', () => {
  it('rejects negative, non-numeric and excessive quantities', () => {
    const doc = seedOrder();
    const [linea] = doc.lineasDetalle;
    expect(validateRecepcion({ documentoId: doc.id, fechaRecepcion: '2026-08-03', lineas: [{ linea_id: linea.id, cantidadRecibida: -1 }] }).valid).toBe(false);
    expect(validateRecepcion({ documentoId: doc.id, fechaRecepcion: '2026-08-03', lineas: [{ linea_id: linea.id, cantidadRecibida: 'abc' }] }).valid).toBe(false);
    expect(validateRecepcion({ documentoId: doc.id, fechaRecepcion: '2026-08-03', lineas: [{ linea_id: linea.id, cantidadRecibida: 11 }] }).valid).toBe(false);
  });

  it('rejects orders that are not approved', () => {
    const doc = seedOrder('borrador');
    const [linea] = doc.lineasDetalle;
    const check = validateRecepcion({ documentoId: doc.id, fechaRecepcion: '2026-08-03', lineas: [{ linea_id: linea.id, cantidadRecibida: 1 }] });
    expect(check.valid).toBe(false);
    expect(check.errors.documentoId).toMatch(/aprobadas/);
  });
});

describe('accumulated reception', () => {
  it('records partial and complete receptions and updates the order status', () => {
    const doc = seedOrder();
    const [monitor, cable] = doc.lineasDetalle;

    addRecepcion({
      documentoId: doc.id,
      fechaRecepcion: '2026-08-03',
      lineas: [{ linea_id: monitor.id, cantidadRecibida: 4 }]
    });
    expect(loadRecepciones()).toHaveLength(1);
    expect(receivedQuantityForLine(doc.id, monitor.id)).toBe(4);
    expect(pendingQuantityForLine(doc.id, monitor.id)).toBe(6);
    expect(loadDocuments()[0].status).toBe('aprobado');

    addRecepcion({
      documentoId: doc.id,
      fechaRecepcion: '2026-08-04',
      lineas: [
        { linea_id: monitor.id, cantidadRecibida: 6 },
        { linea_id: cable.id, cantidadRecibida: 5 }
      ]
    });
    expect(loadRecepciones()).toHaveLength(2);
    expect(pendingQuantityForLine(doc.id, monitor.id)).toBe(0);
    expect(loadDocuments()[0].status).toBe('recibido');
  });
});

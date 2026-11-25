import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActiveConfig } from '../../src/module-config.js';
import { resetSession, setSession } from '../../src/auth.js';
import {
  addEntity, addRequisition, approveRequisition, createQuotation, loadQuotations,
  loadRequisitions, pendingQuotationRequisitions, REQUISITION_STATUS,
  validateQuotation, clearAll
} from '../../src/storage.js';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

const provider = (overrides = {}) => addEntity({
  name: 'Proveedor Cotizado',
  code: 'PC-1',
  taxId: 'RFC123456789',
  paymentTerms: 'neto 30',
  creditLimit: 100000,
  categoriaProveedor: 'Servicios',
  ...overrides
});

function authorizedRequest(){
  const requisition = addRequisition({
    department: 'TI',
    justification: 'Renovar estaciones de trabajo',
    lineasDetalle: [
      { descripcion: 'Laptop', cantidad: 2, unidadMedida: 'unidades', precioEstimado: 1000 }
    ]
  });
  return approveRequisition(requisition.id);
}

beforeEach(() => {
  clearAll();
  setActiveConfig({
    customFields: [
      { target: 'entity', key: 'categoriaProveedor', label: 'Categoría', type: 'text', required: true }
    ],
    taxRate: 0.19
  });
  setSession({ id: 'u-admin', username: 'admin', name: 'Admin', role: 'administrador', active: true });
});

afterEach(() => {
  resetSession();
});

describe('cotizaciones US5', () => {
  it('lista solo solicitudes autorizadas sin cotización', () => {
    const requisition = authorizedRequest();
    expect(pendingQuotationRequisitions().map(r => r.id)).toContain(requisition.id);
  });

  it('crea una cotización vinculada, calcula totales y cambia el estado de la solicitud', () => {
    const requisition = authorizedRequest();
    const entity = provider();
    const quotation = createQuotation({
      requisitionId: requisition.id,
      entityId: entity.entity_id,
      lineas: [{ precioUnitario: '1200' }]
    });

    expect(quotation.requisitionId).toBe(requisition.id);
    expect(quotation.estado).toBe(REQUISITION_STATUS.IN_QUOTATION);
    expect(quotation.subtotal).toBe(2400);
    expect(quotation.taxAmount).toBe(456);
    expect(quotation.totalAmount).toBe(2856);
    expect(loadRequisitions()[0].status).toBe(REQUISITION_STATUS.IN_QUOTATION);
    expect(loadRequisitions()[0].quotationId).toBe(quotation.id);
    expect(pendingQuotationRequisitions()).toHaveLength(0);
  });

  it('bloquea cotizaciones duplicadas', () => {
    const requisition = authorizedRequest();
    const entity = provider();
    const payload = {
      requisitionId: requisition.id,
      entityId: entity.entity_id,
      lineas: [{ precioUnitario: 1200 }]
    };
    createQuotation(payload);
    expect(() => createQuotation(payload)).toThrow(/ya tiene una cotización/);
    expect(loadQuotations()).toHaveLength(1);
  });

  it('rechaza proveedores inactivos o incompletos y precios inválidos', () => {
    const requisition = authorizedRequest();
    const inactive = provider({ estado: 'Inactivo' });
    expect(validateQuotation({
      requisitionId: requisition.id,
      entityId: inactive.entity_id,
      lineas: [{ precioUnitario: 100 }]
    }).valid).toBe(false);

    const incomplete = provider({ paymentTerms: '' });
    expect(validateQuotation({
      requisitionId: requisition.id,
      entityId: incomplete.entity_id,
      lineas: [{ precioUnitario: 100 }]
    }).valid).toBe(false);

    const entity = provider();
    expect(validateQuotation({
      requisitionId: requisition.id,
      entityId: entity.entity_id,
      lineas: [{ precioUnitario: -1 }]
    }).valid).toBe(false);
  });

  it('bloquea la generación a roles sin permiso de compras', () => {
    const requisition = authorizedRequest();
    const entity = provider();
    setSession({ id: 'u-sol', username: 'sol', name: 'Sol', role: 'solicitante', active: true });
    expect(() => createQuotation({
      requisitionId: requisition.id,
      entityId: entity.entity_id,
      lineas: [{ precioUnitario: 1200 }]
    })).toThrow(/no permite generar cotizaciones/);
  });
});

import {
  DOCUMENT_STATUS,
  ISSUED_ORDER_STATUSES,
  REQUISITION_STATUS,
  clearAll,
  saveDocuments,
  saveEntities,
  saveReceptions,
  saveRequisitions,
  saveUsers
} from './storage.js';
import { DEFAULT_TAX_RATE, applyTotalesToCabecera, computeSubtotalLinea } from './module-config.js';

const RUT_WEIGHTS = [2, 3, 4, 5, 6, 7];
const SEED_VERSION_KEY = 'erp_base_module:mockSeedVersion';
const SEED_VERSION = '2026-11-v4';

export const MOCK_COUNTS = Object.freeze({
  entities: 7,
  users: 20,
  documents: 150,
  pendingRequisitions: 3,
  issuedOrders: 44,
  receptions: 56
});

const PARTIAL_EMITTED_COUNT = 8;

const ENTITY_SEEDS = [
  {
    name: 'Insumos Industriales Biobío SpA', code: 'PROV-001', taxId: '76.432.890-K',
    categoriaProveedor: 'Ferretería y seguridad industrial', category: 'Ferretería y seguridad industrial',
    vendedorContacto: 'Carlos Mendoza', email: 'cmendoza@insumosbiobio.cl', paymentTerms: '30 días', estado: 'Activo',
    phone: '+56 41 245 1200', address: 'Av. Coral 1200, Concepción',
    description: 'Ferretería y seguridad industrial', targetDate: '2026-12-15', creditLimit: 12000000
  },
  {
    name: 'Logística y Transportes del Sur Ltda.', code: 'PROV-002', taxId: '77.120.456-7',
    categoriaProveedor: 'Transporte de carga y embalaje', category: 'Transporte de carga y embalaje',
    vendedorContacto: 'Valentina Rojas', email: 'vrojas@transportesdelsur.cl', paymentTerms: '45 días', estado: 'Activo',
    phone: '+56 41 246 8810', address: 'Av. Colmo 750, Concepción',
    description: 'Transporte de carga y embalaje', targetDate: '2026-12-20', creditLimit: 18000000
  },
  {
    name: 'Tecnología y Redes Concepción S.A.', code: 'PROV-003', taxId: '96.854.120-5',
    categoriaProveedor: 'Equipamiento TI y redes', category: 'Equipamiento TI y redes',
    vendedorContacto: 'Felipe Herrera', email: 'fherrera@tecnoredconce.cl', paymentTerms: 'Contado', estado: 'Activo',
    phone: '+56 41 223 4470', address: 'Av. Alemania 0520, Concepción',
    description: 'Equipamiento TI y redes', targetDate: '2027-01-10', creditLimit: 9000000
  },
  {
    name: 'Papelería y Suministros Oficina Chile Ltda.', code: 'PROV-004', taxId: '76.981.234-2',
    categoriaProveedor: 'Artículos de escritorio e impresión', category: 'Artículos de escritorio e impresión',
    vendedorContacto: 'Daniela Castro', email: 'dcastro@suministrosofichile.cl', paymentTerms: '30 días', estado: 'Activo',
    phone: '+56 2 2478 3390', address: 'Calle Manuel Rodríguez 620, Ñuñoa',
    description: 'Artículos de escritorio e impresión', targetDate: '2026-12-05', creditLimit: 22000000
  },
  {
    name: 'Maestranza y Aceros Talcahuano SpA', code: 'PROV-005', taxId: '77.543.210-1',
    categoriaProveedor: 'Estructuras metálicas y repuestos', category: 'Estructuras metálicas y repuestos',
    vendedorContacto: 'Rodrigo Silva', email: 'rsilva@acerostalcahuano.cl', paymentTerms: '60 días', estado: 'Activo',
    phone: '+56 41 276 5530', address: 'Av. Cristóbal Colón 1850, Talcahuano',
    description: 'Estructuras metálicas y repuestos', targetDate: '2027-02-01', creditLimit: 18000000
  },
  {
    name: 'Envases y Embalajes Austral Ltda.', code: 'PROV-006', taxId: '76.219.876-5',
    categoriaProveedor: 'Cartón corrugado y plásticos', category: 'Cartón corrugado y plásticos',
    vendedorContacto: 'Camila Muñoz', email: 'cmunoz@envasesaustral.cl', paymentTerms: '30 días', estado: 'Activo',
    phone: '+56 2 2789 4512', address: 'Av. Costanera Norte 890, Recoleta',
    description: 'Cartón corrugado y plásticos', targetDate: '2027-01-25', creditLimit: 15000000
  },
  {
    name: 'Servicios de Aseo y Mantención Integral SpA', code: 'PROV-007', taxId: '77.890.123-K',
    categoriaProveedor: 'Insumos químicos y limpieza', category: 'Insumos químicos y limpieza',
    vendedorContacto: 'Andrés Morales', email: 'amorales@mantencionintegral.cl', paymentTerms: '15 días', estado: 'Inactivo',
    phone: '+56 2 2634 1190', address: 'Calle Maipo 1450, San Bernardo',
    description: 'Insumos químicos y limpieza', targetDate: '2026-12-12', creditLimit: 12000000
  }
];

const USER_SEEDS = [
  { username: 'camila.herrera', name: 'Camila Herrera', role: 'administrador', department: 'General' },
  { username: 'miguel.andrade', name: 'Miguel Andrade', role: 'administrador', department: 'TI' },
  { username: 'lucia.valdes', name: 'Lucía Valdés', role: 'administrador', department: 'General' },
  { username: 'javier.ortiz', name: 'Javier Ortiz', role: 'administrador', department: 'Compras' },
  { username: 'ana.torres', name: 'Ana Torres', role: 'solicitante', department: 'Operaciones' },
  { username: 'diego.silva', name: 'Diego Silva', role: 'solicitante', department: 'Operaciones' },
  { username: 'fernanda.rios', name: 'Fernanda Ríos', role: 'solicitante', department: 'Compras' },
  { username: 'patricio.vega', name: 'Patricio Vega', role: 'solicitante', department: 'TI' },
  { username: 'valentina.cruz', name: 'Valentina Cruz', role: 'solicitante', department: 'General' },
  { username: 'rodrigo.lagos', name: 'Rodrigo Lagos', role: 'solicitante', department: 'Operaciones', active: false },
  { username: 'claudia.mena', name: 'Claudia Mena', role: 'aprobador', department: 'General' },
  { username: 'ivan.ramos', name: 'Iván Ramos', role: 'aprobador', department: 'Operaciones' },
  { username: 'mariana.soto', name: 'Mariana Soto', role: 'aprobador', department: 'Compras' },
  { username: 'paulo.castro', name: 'Paulo Castro', role: 'aprobador', department: 'General' },
  { username: 'josefa.campos', name: 'Josefa Campos', role: 'encargado_compras', department: 'Compras' },
  { username: 'andres.pulido', name: 'Andrés Pulido', role: 'encargado_compras', department: 'Compras' },
  { username: 'carmen.vega', name: 'Carmen Vega', role: 'encargado_compras', department: 'Compras' },
  { username: 'martin.salgado', name: 'Martín Salgado', role: 'encargado_recepcion', department: 'Operaciones' },
  { username: 'jennifer.mora', name: 'Jennifer Mora', role: 'encargado_recepcion', department: 'Operaciones' },
  { username: 'oscar.araya', name: 'Óscar Araya', role: 'encargado_recepcion', department: 'Operaciones', active: false }
];

const PRODUCTS = [
  { sku: 'INS-001', descripcion: 'Laptop Lenovo ThinkPad E14', unidadMedida: 'unidades', precioUnitario: 780000 },
  { sku: 'INS-002', descripcion: 'Monitor LG de 24 pulgadas', unidadMedida: 'unidades', precioUnitario: 145000 },
  { sku: 'INS-003', descripcion: 'Silla ergonómica de oficina', unidadMedida: 'unidades', precioUnitario: 89000 },
  { sku: 'INS-004', descripcion: 'Papel A4 caja de 500 hojas', unidadMedida: 'cajas', precioUnitario: 12500 },
  { sku: 'INS-005', descripcion: 'Aceite industrial ISO 46', unidadMedida: 'litros', precioUnitario: 9800 },
  { sku: 'INS-006', descripcion: 'Acero estructural ASTM A36', unidadMedida: 'kg', precioUnitario: 2100 },
  { sku: 'INS-007', descripcion: 'Servicio de mantención preventiva', unidadMedida: 'unidades', precioUnitario: 250000 },
  { sku: 'INS-008', descripcion: 'Cinta transportadora de 60 cm', unidadMedida: 'metros', precioUnitario: 32000 },
  { sku: 'INS-009', descripcion: 'Impresora láser multifunción', unidadMedida: 'unidades', precioUnitario: 320000 },
  { sku: 'INS-010', descripcion: 'Licencia anual de software ERP', unidadMedida: 'unidades', precioUnitario: 180000 },
  { sku: 'INS-011', descripcion: 'Interruptor automático industrial', unidadMedida: 'unidades', precioUnitario: 10500 }
];

const STATUS_META = {
  [DOCUMENT_STATUS.APPROVED]: { label: 'Aprobada', tipoDocumento: 'Solicitud de Cotización' },
  [DOCUMENT_STATUS.ISSUED]: { label: 'Emitida', tipoDocumento: 'Orden de Compra' },
  [DOCUMENT_STATUS.REJECTED]: { label: 'Rechazada', tipoDocumento: 'Orden de Compra' },
  [DOCUMENT_STATUS.RECEIVED]: { label: 'Recibida', tipoDocumento: 'Orden de Compra' }
};

const DOCUMENT_STATUS_PLAN = [
  [DOCUMENT_STATUS.ISSUED, 38],
  [DOCUMENT_STATUS.RECEIVED, 6],
  [DOCUMENT_STATUS.APPROVED, 80],
  [DOCUMENT_STATUS.REJECTED, 26]
];

const CENTROS_COSTO = ['CC-TI', 'CC-OPERACIONES', 'CC-PLANTA', 'CC-ADMIN', 'CC-MANTENCION'];

const REQUISITION_ITEMS = {
  papel: { sku: 'REQ-PAP-001', descripcion: 'Papel A4 caja de 500 hojas', unidadMedida: 'cajas', precioEstimado: 12500 },
  hdmi: { sku: 'REQ-CAB-002', descripcion: 'Cable HDMI de 2 metros', unidadMedida: 'unidades', precioEstimado: 4500 },
  mouse: { sku: 'REQ-MOU-003', descripcion: 'Mouse USB óptico', unidadMedida: 'unidades', precioEstimado: 8900 },
  teclado: { sku: 'REQ-TEC-004', descripcion: 'Teclado USB estándar', unidadMedida: 'unidades', precioEstimado: 12900 },
  cafe: { sku: 'REQ-CAF-005', descripcion: 'Café molido para oficina', unidadMedida: 'kg', precioEstimado: 7800 },
  lampara: { sku: 'REQ-LAM-006', descripcion: 'Lámpara LED de escritorio', unidadMedida: 'unidades', precioEstimado: 9500 },
  libreta: { sku: 'REQ-LIB-007', descripcion: 'Libreta corporativa', unidadMedida: 'unidades', precioEstimado: 3200 },
  impresion: { sku: 'REQ-IMP-008', descripcion: 'Servicio de impresión de documentos', unidadMedida: 'servicios', precioEstimado: 6000 }
};

const REQUISITION_SEEDS = [
  { requester: 5, department: 'Operaciones', budgetLine: 'OP-01', justification: 'Se necesitan papeles y cables para la documentación de terreno.', items: [['papel', 2], ['hdmi', 4]] },
  { requester: 6, department: 'TI', budgetLine: 'TI-02', justification: 'Reposición de periféricos para dos puestos de trabajo nuevos.', items: [['mouse', 2], ['teclado', 1]] },
  { requester: 9, department: 'General', budgetLine: 'GE-01', justification: 'La lámpara actual de la recepción dejó de funcionar.', items: [['lampara', 1]] }
];

function pad(value){
  return String(value).padStart(2, '0');
}

function isoFromDate(date, hour = '09:00:00.000Z'){
  return `${date}T${hour}`;
}

function addDays(dateString, days){
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function folioLabel(doc){
  const folio = ['OC', 'SC'].includes(doc.series) ? String(doc.folio).padStart(4, '0') : String(doc.folio);
  return `${doc.series ? `${doc.series}-` : ''}${folio}`;
}

export function rutVerificador(base){
  const digits = String(base).replace(/\D/g, '');
  let sum = 0;
  for(let i = 0; i < digits.length; i += 1){
    const digit = Number(digits[digits.length - 1 - i]);
    sum += digit * RUT_WEIGHTS[i % RUT_WEIGHTS.length];
  }
  const result = 11 - (sum % 11);
  if(result === 11) return '0';
  if(result === 10) return 'K';
  return String(result);
}

export function formatRut(base){
  const digits = String(base).replace(/\D/g, '');
  const body = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${rutVerificador(digits)}`;
}

function buildEntities(){
  return ENTITY_SEEDS.map((seed, index) => ({
    id: `mock-entity-${pad(index + 1)}`,
    entity_id: `mock-proveedor-${pad(index + 1)}`,
    ...seed,
    createdAt: isoFromDate(`2026-07-${pad((index % 28) + 1)}`),
    updatedAt: isoFromDate('2026-11-15')
  }));
}

function buildUsers(){
  return USER_SEEDS.map((seed, index) => {
    return {
      id: `mock-user-${pad(index + 1)}`,
      username: seed.username,
      name: seed.name,
      email: `${seed.username}@empresa.cl`,
      rut: formatRut(12345000 + index + 1),
      department: seed.department,
      role: seed.role,
      active: seed.active !== false,
      lastAccess: isoFromDate(
        `2026-11-${pad(8 + (index % 10))}`,
        `${pad(8 + (index % 10))}:${pad((index * 7) % 60)}:00.000Z`
      ),
      createdAt: isoFromDate(`2026-07-${pad((index % 28) + 1)}`),
      updatedAt: isoFromDate('2026-11-15')
    };
  });
}

function buildDocuments(entities, users){
  const statuses = DOCUMENT_STATUS_PLAN.flatMap(([status, count]) => Array.from({ length: count }, () => status));
  const folioCounters = { BOR: 3000, SC: 2000, OC: 2040 };
  return statuses.map((status, index) => {
    const id = `mock-document-${pad(index + 1)}`;
    const entity = entities[index % entities.length];
    const creator = users[(index * 3 + 4) % users.length];
    const series = status === DOCUMENT_STATUS.APPROVED ? 'SC' : 'OC';
    const partial = status === DOCUMENT_STATUS.ISSUED && index < PARTIAL_EMITTED_COUNT;
    folioCounters[series] += 1;
    const startDate = `2026-08-${pad((index % 20) + 1)}`;
    const endDate = addDays(startDate, 10 + (index % 5));
    const centroCosto = CENTROS_COSTO[index % CENTROS_COSTO.length];
    const meta = STATUS_META[status];
    const lineasDetalle = Array.from({ length: 1 + (index % 3) }, (_, lineIndex) => {
      const product = PRODUCTS[(index + lineIndex * 3) % PRODUCTS.length];
      const cantidad = 2 + ((index + lineIndex * 2) % 8);
      const porcentajeDescuentoLinea = (index + lineIndex) % 3 === 0 ? 5 : 0;
      return {
        id: `mock-line-${pad(index + 1)}-${lineIndex + 1}`,
        documento_id: id,
        producto_id: product.sku,
        descripcion: product.descripcion,
        cantidad,
        unidadMedida: product.unidadMedida,
        precioUnitario: product.precioUnitario,
        porcentajeDescuentoLinea,
        subtotalLinea: computeSubtotalLinea({ cantidad, precioUnitario: product.precioUnitario, porcentajeDescuentoLinea }),
        centroCosto
      };
    });
    const document = {
      id,
      entity_id: entity.entity_id,
      series,
      folio: folioCounters[series],
      startDate,
      endDate,
      quantity: lineasDetalle.reduce((acc, linea) => acc + linea.cantidad, 0),
      discount: 0,
      currency: 'CLP',
      paymentTerms: entity.paymentTerms,
      status,
      estadoVisible: meta.label,
      tipoDocumento: meta.tipoDocumento,
      prioridad: index % 9 === 0 ? 'Urgente' : 'Normal',
      tipoCambio: 1,
      fechaEmision: startDate,
      tasaImpuesto: DEFAULT_TAX_RATE,
      justificacion: `Compra planificada para ${centroCosto} durante el periodo ${startDate}.`,
      centroCosto,
      lineasDetalle,
      createdBy: creator.id,
      createdByName: creator.name,
      createdAt: isoFromDate(startDate),
      updatedAt: isoFromDate(endDate)
    };
    if(status === DOCUMENT_STATUS.APPROVED){
      document.approvedAt = isoFromDate(endDate, '11:20:00.000Z');
    }
    if(status === DOCUMENT_STATUS.REJECTED){
      document.rejectionReason = 'El monto supera el presupuesto aprobado para el área.';
      document.rejectedAt = isoFromDate(endDate, '12:00:00.000Z');
    }
    if(status === DOCUMENT_STATUS.RECEIVED || partial){
      document.recepcionEstado = status === DOCUMENT_STATUS.RECEIVED ? 'completa' : 'parcial';
      document.receivedAt = isoFromDate(addDays(endDate, 1), '10:30:00.000Z');
    }
    return applyTotalesToCabecera(document, DEFAULT_TAX_RATE);
  });
}

function splitQuantity(total, partial){
  const target = partial ? Math.max(1, Math.floor(total * 0.75)) : total;
  const parts = [0.3, 0.3, 0.25, 0.15].map(weight => Math.floor(target * weight));
  let remaining = target - parts.reduce((acc, part) => acc + part, 0);
  let index = 0;
  while(remaining > 0){
    parts[index % parts.length] += 1;
    remaining -= 1;
    index += 1;
  }
  return parts;
}

function buildReceptions(documents, users){
  const responsables = users.filter(user => user.role === 'encargado_recepcion');
  const receptions = [];
  documents.filter(doc => doc.status === DOCUMENT_STATUS.RECEIVED || doc.recepcionEstado === 'parcial').forEach(doc => {
    const partial = doc.recepcionEstado === 'parcial';
    const splits = doc.lineasDetalle.map(linea => splitQuantity(Number(linea.cantidad), partial));
    for(let receipt = 0; receipt < 4; receipt += 1){
      const fechaRecepcion = isoFromDate(addDays(doc.endDate, receipt + 1), '10:30:00.000Z');
      receptions.push({
        id: `mock-reception-${pad(receptions.length + 1)}`,
        orderId: doc.id,
        orderFolio: folioLabel(doc),
        fechaRecepcion,
        responsable: responsables[receipt % responsables.length].name,
        observaciones: partial ? 'Recepción parcial pendiente de completar.' : 'Recepción conforme con la orden de compra.',
        estado: partial ? 'parcial' : 'completa',
        lineas: doc.lineasDetalle.map((linea, lineIndex) => ({
          ordenLineaIndex: lineIndex,
          producto_id: linea.producto_id,
          descripcion: linea.descripcion,
          cantidadSolicitada: linea.cantidad,
          cantidadRecibida: splits[lineIndex][receipt],
          cantidadRechazada: 0,
          motivoRechazo: undefined
        })),
        createdAt: fechaRecepcion
      });
    }
  });
  return receptions.slice(0, MOCK_COUNTS.receptions);
}

function buildRequisitions(users){
  return REQUISITION_SEEDS.map((seed, index) => {
    const requester = users[seed.requester - 1];
    const createdDate = `2026-09-${pad((index % 25) + 1)}`;
    const lineasDetalle = seed.items.map(([itemKey, cantidad]) => {
      const item = REQUISITION_ITEMS[itemKey];
      return {
        producto_id: item.sku,
        descripcion: item.descripcion,
        cantidad,
        unidadMedida: item.unidadMedida,
        precioEstimado: item.precioEstimado
      };
    });
    const requisition = {
      id: `mock-requisition-${pad(index + 1)}`,
      folio: `SOL-${1001 + index}`,
      requesterId: requester.id,
      requesterName: requester.name,
      department: seed.department,
      budgetLine: seed.budgetLine,
      justification: seed.justification,
      lineasDetalle,
      status: REQUISITION_STATUS.PENDING,
      createdAt: isoFromDate(createdDate),
      updatedAt: isoFromDate(createdDate, '16:40:00.000Z')
    };
    return requisition;
  });
}

export function buildMockData(){
  const entities = buildEntities();
  const users = buildUsers();
  const documents = buildDocuments(entities, users);
  const requisitions = buildRequisitions(users);
  const receptions = buildReceptions(documents, users);
  return { entities, users, documents, requisitions, receptions };
}

export const MOCK_DATA = buildMockData();

export function injectMockData(){
  clearAll();
  const data = buildMockData();
  saveEntities(data.entities);
  saveUsers(data.users);
  saveDocuments(data.documents);
  saveRequisitions(data.requisitions);
  saveReceptions(data.receptions);
  localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
  return {
    entities: data.entities.length,
    users: data.users.length,
    documents: data.documents.length,
    requisitions: data.requisitions.filter(r => r.status === REQUISITION_STATUS.PENDING).length,
    issuedOrders: data.documents.filter(d => ISSUED_ORDER_STATUSES.includes(d.status)).length,
    receptions: data.receptions.length
  };
}

export function ensureMockData(){
  try{
    if(localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION) return null;
  }catch{
    return null;
  }
  return injectMockData();
}

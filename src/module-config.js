// ============================================================================
// Configuración del Módulo — edita `userConfig` abajo para adaptar este módulo
// base a un módulo ERP específico. Ningún otro archivo necesita cambios.
// ============================================================================

// Perfil activo: Módulo de Adquisiciones y Compras
// (referencia: specs/001-erp-base-module/plan.md).
// Establece `userConfig = null` para volver a los valores predeterminados
// integrados (Entidad/Documento, sin campos personalizados).
//
// Estructura admitida por `userConfig`:
// {
//   moduleName: 'Adquisiciones y Compras',
//   labels: { entity: 'Proveedor', entities: 'Proveedores', document: 'Orden de Compra', documents: 'Órdenes de Compra' },
//   customFields: [
//     { target: 'entity', key: 'categoriaProveedor', label: 'Categoría del proveedor', type: 'select', options: ['Materias primas', 'Servicios', 'Equipos', 'General'], required: true },
//     { target: 'entity', key: 'vendedorContacto', label: 'Vendedor de contacto', type: 'text' },
//     { target: 'document', key: 'tipoDocumento', label: 'Tipo de documento', type: 'select', options: ['Solicitud de Cotización', 'Orden de Compra', 'Recepción', 'Factura de Proveedor'], required: true },
//     { target: 'document', key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Normal', 'Urgente'] },
//     // Divisas y tipos de cambio (Punto 6 del diseño arquitectónico):
//     // `tipoCambio` es el valor de la divisa del documento (campo base `currency`)
//     // frente a la moneda local; queda congelado en el documento para no alterar
//     // el costo histórico de la compra. `fechaEmision` es el día exacto en que
//     // se fijó ese tipo de cambio y se creó el documento (trazabilidad).
//     { target: 'document', key: 'tipoCambio', label: 'Tipo de cambio', type: 'number' },
//     { target: 'document', key: 'fechaEmision', label: 'Fecha de emisión', type: 'date', required: true }
//   ],
//   statusLifecycle: {
//     statuses: ['borrador', 'cotización', 'aprobado', 'recibido', 'facturado', 'cancelado'],
//     transitions: { borrador: ['cotización', 'cancelado'], cotización: ['aprobado', 'cancelado'], aprobado: ['recibido', 'cancelado'], recibido: ['facturado'], facturado: [], cancelado: [] }
//   },
//   lineasDetalle: {
//     // Etiqueta de la sección en la UI (opcional; por defecto "Líneas de detalle").
//     label: 'Líneas de detalle',
//     // Unidades de medida ofrecidas en el select `unidadMedida` (opcional).
//     unidadesMedida: ['unidades', 'cajas', 'litros', 'kg', 'metros'],
//     // Descuento máximo permitido por línea, en porcentaje (opcional; por defecto 100).
//     maxPorcentajeDescuento: 100,
//     // Campos personalizados por línea, con la misma forma que customFields.
//     camposExtra: [
//       { key: 'centroCosto', label: 'Centro de costo', type: 'text' }
//     ]
//   },
//   theme: { accentColor: '#0f766e' }
// }
export const userConfig = {
  moduleName: 'Adquisiciones y Compras',
  labels: {
    entity: 'Proveedor',
    entities: 'Proveedores',
    document: 'Orden de Compra',
    documents: 'Órdenes de Compra'
  },
  customFields: [
    // Proveedores
    { target: 'entity', key: 'categoriaProveedor', label: 'Categoría del proveedor', type: 'select', options: ['Materias primas', 'Servicios', 'Equipos', 'General'], required: true },
    { target: 'entity', key: 'vendedorContacto', label: 'Vendedor de contacto', type: 'text' },
    // Documentos de compra
    { target: 'document', key: 'tipoDocumento', label: 'Tipo de documento', type: 'select', options: ['Solicitud de Cotización', 'Orden de Compra', 'Recepción', 'Factura de Proveedor'], required: true },
    { target: 'document', key: 'prioridad', label: 'Prioridad', type: 'select', options: ['Normal', 'Urgente'] },
    // Divisas y tipos de cambio: congelan el costo de la compra y su trazabilidad
    { target: 'document', key: 'tipoCambio', label: 'Tipo de cambio', type: 'number' },
    { target: 'document', key: 'fechaEmision', label: 'Fecha de emisión', type: 'date', required: true }
  ],
  statusLifecycle: {
    statuses: ['borrador', 'cotización', 'aprobado', 'recibido', 'facturado', 'cancelado'],
    transitions: {
      borrador: ['cotización', 'cancelado'],
      cotización: ['aprobado', 'cancelado'],
      aprobado: ['recibido', 'cancelado'],
      recibido: ['facturado'],
      facturado: [],
      cancelado: []
    }
  },
  theme: { accentColor: '#0f766e' }
};

// ---------------------------------------------------------------------------
// Cargador central — no deberías necesitar modificar nada debajo de esta línea.
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG = Object.freeze({
  moduleName: 'Módulo Base ERP',
  labels: Object.freeze({
    entity: 'Entidad',
    entities: 'Entidades',
    document: 'Documento',
    documents: 'Documentos'
  }),
  customFields: Object.freeze([]),
  statusLifecycle: null,
  lineasDetalle: Object.freeze({
    label: 'Líneas de detalle',
    unidadesMedida: Object.freeze([]),
    maxPorcentajeDescuento: 100,
    camposExtra: Object.freeze([])
  }),
  theme: Object.freeze({ accentColor: '#2563eb' })
});

export const FIELD_TYPES = ['text', 'number', 'date', 'select'];

// ---------------------------------------------------------------------------
// Sub-esquema de las Líneas de Detalle (relación 1 a N con el Documento).
// Cada documento de compra/venta (Orden de Compra, Recepción, Factura) puede
// tener cero o muchas líneas; cada línea pertenece a un único documento.
// El vínculo es `documento_id` (FK -> document.id), que el storage asigna al
// persistir la línea dentro de su documento.
// ---------------------------------------------------------------------------
export const LINEA_DETALLE_FIELDS = Object.freeze({
  // FK -> document.id (relación 1 a N); la rellena el storage, no el usuario.
  documento_id: Object.freeze({ key: 'documento_id', label: 'Documento', type: 'text', required: false, computed: true }),
  // Referencia al catálogo de bienes/servicios (id o SKU).
  producto_id: Object.freeze({ key: 'producto_id', label: 'Producto (ID/SKU)', type: 'text', required: true }),
  // Descripción libre del ítem.
  descripcion: Object.freeze({ key: 'descripcion', label: 'Descripción', type: 'text', required: true }),
  // Cantidad: número obligatorio y estrictamente positivo.
  cantidad: Object.freeze({ key: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 0, exclusiveMin: true }),
  // Unidad de medida: select si la config define `unidadesMedida`; texto si no.
  unidadMedida: Object.freeze({ key: 'unidadMedida', label: 'Unidad de medida', type: 'select', required: true }),
  // Precio unitario: número obligatorio y no negativo.
  precioUnitario: Object.freeze({ key: 'precioUnitario', label: 'Precio unitario', type: 'number', required: true, min: 0 }),
  // Descuento por línea, en porcentaje (opcional, 0..100).
  porcentajeDescuentoLinea: Object.freeze({ key: 'porcentajeDescuentoLinea', label: '% Descuento de línea', type: 'number', required: false, min: 0, max: 100, default: 0 }),
  // Subtotal de la línea: calculado (nunca lo escribe el usuario).
  subtotalLinea: Object.freeze({ key: 'subtotalLinea', label: 'Subtotal de línea', type: 'number', required: false, computed: true })
});

// Nombres base de las líneas, usados para rechazar colisiones de campos extra.
export const BASE_LINEA_FIELDS = Object.freeze(Object.keys(LINEA_DETALLE_FIELDS));

export const BASE_FIELDS = Object.freeze({
  entity: Object.freeze(['id', 'entity_id', 'name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'creditLimit', 'paymentTerms', 'createdAt', 'updatedAt']),
  document: Object.freeze(['id', 'entity_id', 'series', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'currency', 'paymentTerms', 'notes', 'status', 'createdAt', 'updatedAt']),
  detalle: BASE_LINEA_FIELDS
});

function isNonEmptyString(v){ return typeof v === 'string' && v.trim().length > 0; }

// Valida una lista de campos personalizados. Por defecto sólo acepta los
// destinos 'entity' y 'document' (comportamiento histórico de customFields).
// Los `lineasDetalle.camposExtra` invocan esta función con un `opts` que fija
// el destino 'detalle' y los límites/nombres base correspondientes.
function validateCustomFields(raw, errors, opts = {}){
  const fixedTarget = opts.target; // si viene, el destino queda fijado y no se lee de cada campo
  const baseFields = opts.baseFields || null; // límites para el destino fijado
  const where = opts.label || 'customFields';
  const knownTargets = baseFields ? [fixedTarget] : ['entity', 'document'];
  const seen = {};
  for(const t of knownTargets) seen[t] = new Set();
  if(!Array.isArray(raw)) { errors.push(`${where} debe ser un arreglo`); return []; }
  const clean = [];
  raw.forEach((f, i) => {
    const fieldPath = `${where}[${i}]`;
    if(!f || typeof f !== 'object'){ errors.push(`${fieldPath} debe ser un objeto`); return; }
    const target = fixedTarget || f.target;
    if(!knownTargets.includes(target)){ errors.push(`${fieldPath}.target debe ser "entity" o "document"`); return; }
    if(!isNonEmptyString(f.key)){ errors.push(`${fieldPath}.key debe ser una cadena no vacía`); return; }
    const baseList = baseFields || BASE_FIELDS[target];
    if(baseList.includes(f.key)){ errors.push(`${fieldPath}.key "${f.key}" choca con un campo base de ${target}`); return; }
    if(seen[target].has(f.key)){ errors.push(`${fieldPath}.key "${f.key}" está declarada más de una vez`); return; }
    if(!FIELD_TYPES.includes(f.type)){ errors.push(`${fieldPath}.type debe ser uno de: ${FIELD_TYPES.join(', ')}`); return; }
    if(f.type === 'select' && !(Array.isArray(f.options) && f.options.length > 0)){ errors.push(`${fieldPath}.options debe ser un arreglo no vacío para campos de selección`); return; }
    seen[target].add(f.key);
    clean.push({ target, key: f.key, label: isNonEmptyString(f.label) ? f.label : f.key, type: f.type, required: Boolean(f.required), options: Array.isArray(f.options) ? [...f.options] : undefined });
  });
  return clean;
}

// Valida y normaliza la configuración de las Líneas de Detalle. Los
// `camposExtra` se validan como campos personalizados cuyo `target` es
// 'detalle' (no colisionan con los campos base de LINEA_DETALLE_FIELDS).
function validateLineasDetalle(raw, errors){
  const base = {
    label: DEFAULT_CONFIG.lineasDetalle.label,
    unidadesMedida: [...DEFAULT_CONFIG.lineasDetalle.unidadesMedida],
    maxPorcentajeDescuento: DEFAULT_CONFIG.lineasDetalle.maxPorcentajeDescuento,
    camposExtra: []
  };
  if(raw === null || raw === undefined) return base;
  if(typeof raw !== 'object'){
    errors.push('lineasDetalle debe ser un objeto');
    return base;
  }
  if(raw.label !== undefined){
    if(!isNonEmptyString(raw.label)) errors.push('lineasDetalle.label debe ser una cadena no vacía');
    else base.label = raw.label.trim();
  }
  if(raw.unidadesMedida !== undefined && raw.unidadesMedida !== null){
    if(!Array.isArray(raw.unidadesMedida) || !raw.unidadesMedida.every(isNonEmptyString)){
      errors.push('lineasDetalle.unidadesMedida debe ser un arreglo no vacío de cadenas');
    } else {
      base.unidadesMedida = raw.unidadesMedida.map(u => u.trim());
    }
  }
  if(raw.maxPorcentajeDescuento !== undefined && raw.maxPorcentajeDescuento !== null){
    const n = Number(raw.maxPorcentajeDescuento);
    if(!Number.isFinite(n) || n < 0 || n > 100){
      errors.push('lineasDetalle.maxPorcentajeDescuento debe ser un número entre 0 y 100');
    } else {
      base.maxPorcentajeDescuento = n;
    }
  }
  if(raw.camposExtra !== undefined && raw.camposExtra !== null){
    base.camposExtra = validateCustomFields(raw.camposExtra, errors, {
      target: 'detalle',
      baseFields: BASE_LINEA_FIELDS,
      label: 'lineasDetalle.camposExtra'
    });
  }
  return base;
}

function validateLifecycle(raw, errors){
  if(raw === null || raw === undefined) return null;
  if(typeof raw !== 'object' || !Array.isArray(raw.statuses) || raw.statuses.length === 0 || !raw.statuses.every(isNonEmptyString)){
    errors.push('statusLifecycle.statuses debe ser un arreglo no vacío de nombres de estado');
    return null;
  }
  const statuses = new Set(raw.statuses);
  const transitions = {};
  if(raw.transitions !== undefined && (typeof raw.transitions !== 'object' || raw.transitions === null)){
    errors.push('statusLifecycle.transitions debe ser un objeto que mapee estado -> arreglo de estados siguientes');
    return null;
  }
  const source = raw.transitions || {};
  for(const [from, toList] of Object.entries(source)){
    if(!statuses.has(from)){ errors.push(`statusLifecycle.transitions referencia el estado desconocido "${from}"`); return null; }
    if(!Array.isArray(toList) || !toList.every((s) => statuses.has(s))){ errors.push(`statusLifecycle.transitions["${from}"] debe listar estados conocidos`); return null; }
    transitions[from] = [...toList];
  }
  return { statuses: [...raw.statuses], transitions };
}

function validateTheme(raw, errors){
  if(raw === null || raw === undefined) return structuredClone(DEFAULT_CONFIG.theme);
  if(typeof raw !== 'object'){
    errors.push('theme debe ser un objeto');
    return structuredClone(DEFAULT_CONFIG.theme);
  }
  const out = { accentColor: DEFAULT_CONFIG.theme.accentColor };
  if(raw.accentColor !== undefined && raw.accentColor !== null){
    const value = String(raw.accentColor).trim();
    if(!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)){
      errors.push('theme.accentColor debe ser un color hexadecimal como #rrggbb');
    } else {
      out.accentColor = value;
    }
  }
  return out;
}

export function normalizeConfig(raw){
  if(raw === null || raw === undefined){
    return { config: structuredClone(DEFAULT_CONFIG), errors: [] };
  }
  if(typeof raw !== 'object'){
    return { config: structuredClone(DEFAULT_CONFIG), errors: ['La configuración del módulo debe ser un objeto'] };
  }
  const errors = [];
  const cfg = structuredClone(DEFAULT_CONFIG);
  if(raw.moduleName !== undefined){
    if(!isNonEmptyString(raw.moduleName)) errors.push('moduleName debe ser una cadena no vacía');
    else cfg.moduleName = raw.moduleName.trim();
  }
  if(raw.labels !== undefined){
    if(typeof raw.labels !== 'object' || raw.labels === null) errors.push('labels debe ser un objeto');
    else {
      for(const key of ['entity', 'entities', 'document', 'documents']){
        if(raw.labels[key] === undefined) continue;
        if(!isNonEmptyString(raw.labels[key])){ errors.push(`labels.${key} debe ser una cadena no vacía`); continue; }
        cfg.labels[key] = raw.labels[key].trim();
      }
    }
  }
  if(raw.customFields !== undefined && raw.customFields !== null){
    cfg.customFields = validateCustomFields(raw.customFields, errors);
  }
  if(raw.statusLifecycle !== undefined){
    const lc = validateLifecycle(raw.statusLifecycle, errors);
    if(lc) cfg.statusLifecycle = lc;
  }
  if(raw.lineasDetalle !== undefined){
    cfg.lineasDetalle = validateLineasDetalle(raw.lineasDetalle, errors);
  }
  if(raw.theme !== undefined){
    cfg.theme = validateTheme(raw.theme, errors);
  }
  return { config: cfg, errors };
}

// ---------------------------------------------------------------------------
// Cálculo de líneas de detalle e integración con la cabecera.
//
// FUENTE DE VERDAD DE TOTALES: el usuario NUNCA escribe los totales de la
// cabecera a mano. `subtotalLinea` se calcula por línea y la sumatoria de esas
// líneas alimenta automáticamente el `subtotal` de la cabecera del documento.
//
// Fórmulas por línea:
//   bruto          = cantidad * precioUnitario
//   porcentaje     = porcentajeDescuentoLinea (0..maxPorcentajeDescuento, def. 0)
//   subtotalLinea  = bruto * (1 - porcentaje / 100)   [redondeado a 2 decimales]
//
// Integración con la cabecera (a ejecutar en el storage/UI al guardar):
//   documento.subtotal    = redondear(subtotalFromLineas(documento.lineasDetalle))
//   documento.taxAmount   = redondear((documento.subtotal - documento.discount) * tasaImpuesto)
//   documento.totalAmount = redondear(documento.subtotal - documento.discount + documento.taxAmount)
//
// Es decir: subtotal de cabecera = Σ subtotalLinea. El `discount` de cabecera se
// aplica DESPUÉS (descuento global), y el impuesto se calcula sobre la base ya
// descontada. Cualquier cambio en las líneas recalcula en cascada estos totales.
// ---------------------------------------------------------------------------

function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

// Calcula el subtotal de UNA línea aplicando su descuento porcentual.
export function computeSubtotalLinea(linea){
  const cantidad = Number(linea && linea.cantidad);
  const precioUnitario = Number(linea && linea.precioUnitario);
  if(!Number.isFinite(cantidad) || !Number.isFinite(precioUnitario)) return 0;
  const bruto = cantidad * precioUnitario;
  const porcentaje = Number(linea.porcentajeDescuentoLinea);
  const pct = Number.isFinite(porcentaje) ? Math.min(Math.max(porcentaje, 0), 100) : 0;
  return round2(bruto * (1 - pct / 100));
}

// Sumatoria de los subtotales de TODAS las líneas de un documento.
// Este valor es el que debe asignarse a `documento.subtotal` en la cabecera.
export function subtotalFromLineas(lineasDetalle){
  if(!Array.isArray(lineasDetalle)) return 0;
  return round2(lineasDetalle.reduce((acc, linea) => {
    const s = linea && linea.subtotalLinea !== undefined
      ? Number(linea.subtotalLinea)
      : computeSubtotalLinea(linea);
    return acc + (Number.isFinite(s) ? s : 0);
  }, 0));
}

// Aplica la cascada de totales de la cabecera a partir de las líneas.
// Devuelve una cabecera nueva (no muta la entrada). `tasaImpuesto` es una
// fracción (p. ej. 0.19 para 19%).
export function applyTotalesToCabecera(documento, tasaImpuesto = 0){
  const cab = { ...documento };
  cab.subtotal = subtotalFromLineas(cab.lineasDetalle);
  const discount = Number.isFinite(Number(cab.discount)) ? Number(cab.discount) : 0;
  const tasa = Number.isFinite(Number(tasaImpuesto)) ? Number(tasaImpuesto) : 0;
  cab.taxAmount = round2(Math.max(cab.subtotal - discount, 0) * tasa);
  cab.totalAmount = round2(cab.subtotal - discount + cab.taxAmount);
  return cab;
}

let activeConfig = structuredClone(DEFAULT_CONFIG);

export function setActiveConfig(config){
  activeConfig = normalizeConfig(config).config;
}

export function getConfig(){
  return activeConfig;
}

export function labelFor(kind){
  return activeConfig.labels[kind] || DEFAULT_CONFIG.labels[kind];
}

export async function loadModuleConfig(){
  const { config, errors } = normalizeConfig(userConfig);
  return { config, errors };
}

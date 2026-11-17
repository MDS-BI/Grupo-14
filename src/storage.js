import { getConfig, computeSubtotalLinea, applyTotalesToCabecera, DEFAULT_TAX_RATE } from './module-config.js';
import { can, currentUser, ROLE_KEYS, PERMISSIONS } from './auth.js';

const ENTITIES_KEY = 'erp_base_module:entities';
const DOCUMENTS_KEY = 'erp_base_module:documents';
const USERS_KEY = 'erp_base_module:users';
const REQUISITIONS_KEY = 'erp_base_module:requisitions';
const RECEPTIONS_KEY = 'erp_base_module:receptions';

export const REQUISITION_STATUS = Object.freeze({
  PENDING: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada'
});

export const DEPARTMENT_BUDGETS = Object.freeze({
  Operaciones: 100000,
  Compras: 150000,
  TI: 80000,
  General: 50000
});

export const DEPARTMENTS = Object.freeze(Object.keys(DEPARTMENT_BUDGETS));

const RECEPTION_ORDER_STATUSES = Object.freeze(['aprobado', 'recibido parcialmente']);
const FINAL_ORDER_STATUSES = Object.freeze(['recibido', 'facturado', 'cancelado']);

function readJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    console.error(`Failed to parse ${key} from storage`, e);
    return fallback;
  }
}

function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadEntities(){ return readJson(ENTITIES_KEY, []); }
export function saveEntities(entities){ writeJson(ENTITIES_KEY, entities); }

export function loadDocuments(){ return readJson(DOCUMENTS_KEY, []); }
export function saveDocuments(documents){ writeJson(DOCUMENTS_KEY, documents); }

export function loadUsers(){ return readJson(USERS_KEY, []); }
export function saveUsers(users){ writeJson(USERS_KEY, users); }

export function loadRequisitions(){ return readJson(REQUISITIONS_KEY, []); }
export function saveRequisitions(requisitions){ writeJson(REQUISITIONS_KEY, requisitions); }

export function loadReceptions(){ return readJson(RECEPTIONS_KEY, []); }
export function saveReceptions(receptions){ writeJson(RECEPTIONS_KEY, receptions); }

function generateId(){
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

function declaredFields(target){
  return getConfig().customFields.filter(f => f.target === target);
}

export function isValidDate(value){
  if(!value) return false;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isEmpty(v){ return v === undefined || v === null || (typeof v === 'string' && !v.trim()); }

function normalizeCustomValue(field, value){
  if(isEmpty(value)) return undefined;
  if(field.type === 'number') return Number(value);
  return String(value).trim();
}

function collectCustomErrors(target, data){
  const errs = {};
  for(const f of declaredFields(target)){
    const v = data ? data[f.key] : undefined;
    if(f.required && isEmpty(v)){ errs[f.key] = `${f.label} es obligatorio`; continue; }
    if(!isEmpty(v)){
      if(f.type === 'number' && !Number.isFinite(Number(v))){ errs[f.key] = `${f.label} debe ser un número`; continue; }
      if(f.type === 'date' && !isValidDate(v)){ errs[f.key] = `${f.label} debe ser una fecha válida (YYYY-MM-DD)`; continue; }
      if(f.type === 'select' && !f.options.includes(String(v).trim())){ errs[f.key] = `${f.label} debe ser uno de: ${f.options.join(', ')}`; }
    }
  }
  return errs;
}

function validateLifecycleStatus(status, currentStatus, errors){
  const lc = getConfig().statusLifecycle;
  if(!lc) return;
  if(currentStatus === undefined || currentStatus === null){
    if(!isEmpty(status) && !lc.statuses.includes(status)){
      errors.status = `El estado debe ser uno de: ${lc.statuses.join(', ')}`;
    }
    return;
  }
  if(status === currentStatus) return;
  const allowed = lc.transitions[currentStatus] || [];
  if(!allowed.includes(status)){
    errors.status = `Transición de estado inválida de "${currentStatus}" a "${status}"`;
  }
}

function isValidEmail(value){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

// ---------------------------------------------------------------------------
// Usuarios y permisos (HU1)
// ---------------------------------------------------------------------------

export function validateUser(payload, existingId){
  const errors = {};
  const username = String(payload.username || '').trim();
  const name = String(payload.name || '').trim();
  const role = String(payload.role || '').trim();
  if(!username) errors.username = 'El usuario es obligatorio';
  else {
    const dup = loadUsers().some(u => u.id !== existingId && String(u.username).toLowerCase() === username.toLowerCase());
    if(dup) errors.username = 'El nombre de usuario ya existe';
  }
  if(!name) errors.name = 'El nombre es obligatorio';
  if(!ROLE_KEYS.includes(role)) errors.role = `El rol debe ser uno de: ${ROLE_KEYS.join(', ')}`;
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addUser(payload){
  const check = validateUser(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const now = new Date().toISOString();
  const user = {
    id: generateId(),
    username: String(payload.username).trim(),
    name: String(payload.name).trim(),
    role: String(payload.role).trim(),
    active: payload.active !== false,
    createdAt: now,
    updatedAt: now
  };
  const list = loadUsers();
  list.push(user);
  saveUsers(list);
  return user;
}

export function updateUser(id, updates){
  const list = loadUsers();
  const idx = list.findIndex(u => u.id === id);
  if(idx === -1) throw new Error('Usuario no encontrado');
  const merged = { ...list[idx], ...updates };
  const check = validateUser(merged, id);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  list[idx] = {
    ...list[idx],
    username: String(merged.username).trim(),
    name: String(merged.name).trim(),
    role: String(merged.role).trim(),
    active: merged.active !== false,
    updatedAt: new Date().toISOString()
  };
  saveUsers(list);
  return list[idx];
}

export function usersWithPendingWork(userId){
  const requisitions = loadRequisitions().filter(r => r.requesterId === userId && !['Rechazada'].includes(r.status) && r.status !== 'Concluida');
  const documents = loadDocuments().filter(d => d.createdBy === userId && !FINAL_ORDER_STATUSES.includes(d.status));
  return { requisitions: requisitions.length, documents: documents.length };
}

export function deactivateUser(id){
  const list = loadUsers();
  const idx = list.findIndex(u => u.id === id);
  if(idx === -1) throw new Error('Usuario no encontrado');
  const pending = usersWithPendingWork(id);
  if(pending.requisitions > 0 || pending.documents > 0){
    throw new Error('No se puede desactivar el usuario: tiene solicitudes u órdenes pendientes en su flujo. Reasigna o concluye esos trámites primero.');
  }
  list[idx] = { ...list[idx], active: false, updatedAt: new Date().toISOString() };
  saveUsers(list);
  return list[idx];
}

// ---------------------------------------------------------------------------
// Entidades (proveedores)
// ---------------------------------------------------------------------------

export function validateEntity({name, code, email, targetDate, creditLimit, ...rest}){
  const errors = {};
  if(!name || !name.trim()) errors.name = 'El nombre es obligatorio';
  if(!code || !code.trim()) errors.code = 'El código es obligatorio';
  if(!isEmpty(email) && !isValidEmail(email)) errors.email = 'El correo electrónico no es válido';
  if(!isEmpty(targetDate) && !isValidDate(targetDate)) errors.targetDate = 'La fecha objetivo debe ser una fecha válida (YYYY-MM-DD)';
  if(!isEmpty(creditLimit)){
    const c = Number(creditLimit);
    if(Number.isNaN(c) || c < 0) errors.creditLimit = 'El límite de crédito debe ser un número no negativo';
  }
  Object.assign(errors, collectCustomErrors('entity', rest));
  return { valid: Object.keys(errors).length === 0, errors };
}

function pickCustomFields(target, data){
  const out = {};
  for(const f of declaredFields(target)){
    const n = normalizeCustomValue(f, data[f.key]);
    if(n !== undefined) out[f.key] = n;
  }
  return out;
}

export function addEntity(payload){
  const now = new Date().toISOString();
  const entity = {
    id: generateId(),
    entity_id: generateId(),
    name: (payload.name||'').trim(),
    code: (payload.code||'').trim(),
    taxId: (payload.taxId||'').trim() || undefined,
    email: (payload.email||'').trim() || undefined,
    phone: (payload.phone||'').trim() || undefined,
    address: (payload.address||'').trim() || undefined,
    category: (payload.category||'').trim() || undefined,
    description: (payload.description||'').trim() || undefined,
    targetDate: (payload.targetDate||'').trim() || undefined,
    creditLimit: isEmpty(payload.creditLimit) ? undefined : Number(payload.creditLimit),
    paymentTerms: (payload.paymentTerms||'').trim() || undefined,
    ...pickCustomFields('entity', payload),
    createdAt: now,
    updatedAt: now
  };
  const list = loadEntities();
  list.push(entity);
  saveEntities(list);
  return entity;
}

export function updateEntity(id, updates){
  const list = loadEntities();
  const idx = list.findIndex(e => e.id === id);
  if(idx === -1) throw new Error('Entidad no encontrada');
  const merged = { ...list[idx], ...updates };
  list[idx] = {
    ...list[idx],
    name: (merged.name||'').trim(),
    code: (merged.code||'').trim(),
    taxId: (merged.taxId||'').trim() || undefined,
    email: (merged.email||'').trim() || undefined,
    phone: (merged.phone||'').trim() || undefined,
    address: (merged.address||'').trim() || undefined,
    category: (merged.category||'').trim() || undefined,
    description: (merged.description||'').trim() || undefined,
    targetDate: (merged.targetDate||'').trim() || undefined,
    creditLimit: isEmpty(merged.creditLimit) ? undefined : Number(merged.creditLimit),
    paymentTerms: (merged.paymentTerms||'').trim() || undefined,
    ...pickCustomFields('entity', merged),
    updatedAt: new Date().toISOString()
  };
  saveEntities(list);
  return list[idx];
}

export function deleteEntity(id){
  const list = loadEntities();
  const entity = list.find(e => e.id === id);
  const newList = list.filter(e => e.id !== id);
  saveEntities(newList);
  if(entity) deleteDocumentsForEntity(entity.entity_id);
  return newList;
}

// ---------------------------------------------------------------------------
// Líneas de detalle (HU2 / HU3 / HU6)
// ---------------------------------------------------------------------------

export function validateLineasDetalle(lineas){
  const errors = {};
  if(!Array.isArray(lineas) || lineas.length === 0){
    errors.lineas = 'Añade al menos una línea de detalle';
    return { valid: false, errors, lineas: [] };
  }
  const maxPct = Number(getConfig().lineasDetalle.maxPorcentajeDescuento);
  const clean = [];
  lineas.forEach((l, i) => {
    const n = i + 1;
    const producto_id = String(l.producto_id || '').trim();
    const descripcion = String(l.descripcion || '').trim();
    const cantidad = Number(l.cantidad);
    const precioUnitario = Number(l.precioUnitario);
    const pctRaw = l.porcentajeDescuentoLinea === undefined || l.porcentajeDescuentoLinea === null || l.porcentajeDescuentoLinea === ''
      ? 0
      : Number(l.porcentajeDescuentoLinea);
    const unidadMedida = String(l.unidadMedida || '').trim();
    if(!producto_id) errors[`linea-${i}-producto_id`] = `Línea ${n}: el producto es obligatorio`;
    if(!descripcion) errors[`linea-${i}-descripcion`] = `Línea ${n}: la descripción es obligatoria`;
    if(!Number.isFinite(cantidad) || cantidad <= 0) errors[`linea-${i}-cantidad`] = `Línea ${n}: la cantidad debe ser mayor que cero`;
    if(!unidadMedida) errors[`linea-${i}-unidadMedida`] = `Línea ${n}: la unidad de medida es obligatoria`;
    if(!Number.isFinite(precioUnitario) || precioUnitario < 0) errors[`linea-${i}-precioUnitario`] = `Línea ${n}: el precio unitario debe ser un número no negativo`;
    if(!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > maxPct) errors[`linea-${i}-porcentajeDescuentoLinea`] = `Línea ${n}: el descuento debe estar entre 0 y ${maxPct}`;
    clean.push({
      producto_id,
      descripcion,
      cantidad,
      unidadMedida,
      precioUnitario,
      porcentajeDescuentoLinea: Number.isFinite(pctRaw) ? pctRaw : 0
    });
  });
  return { valid: Object.keys(errors).length === 0, errors, lineas: clean };
}

function prepareLineas(lineas, documentoId){
  const check = validateLineasDetalle(lineas);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  return check.lineas.map(l => ({
    id: generateId(),
    documento_id: documentoId,
    ...l,
    subtotalLinea: computeSubtotalLinea(l)
  }));
}

// ---------------------------------------------------------------------------
// Documentos (órdenes de compra)
// ---------------------------------------------------------------------------

export function validateDocument(payload, currentStatus){
  const {entityId, series, folio, startDate, endDate, quantity, subtotal, discount, taxAmount, totalAmount, status} = payload;
  const errors = {};
  const entities = loadEntities();
  if(!entityId || !entities.some(e => e.entity_id === entityId)){
    errors.entityId = 'Selecciona una entidad para el documento';
  }
  if(isEmpty(folio)){ errors.folio = 'El folio es obligatorio'; }
  else {
    const f = Number(folio);
    if(!Number.isInteger(f) || f <= 0) errors.folio = 'El folio debe ser un entero positivo';
  }
  if(!startDate){ errors.startDate = 'La fecha de inicio es obligatoria'; }
  else if(!isValidDate(startDate)) errors.startDate = 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)';
  if(!endDate){ errors.endDate = 'La fecha de fin es obligatoria'; }
  else if(!isValidDate(endDate)) errors.endDate = 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)';
  if(startDate && endDate && isValidDate(startDate) && isValidDate(endDate) && endDate < startDate){
    errors.endDate = 'La fecha de fin debe ser igual o posterior a la fecha de inicio';
  }
  if(quantity !== undefined && quantity !== null && quantity !== ''){
    const n = Number(quantity);
    if(!Number.isInteger(n) || n <= 0) errors.quantity = 'La cantidad debe ser un entero positivo';
  }
  for(const [key, label] of [['subtotal', 'El subtotal'], ['discount', 'El descuento'], ['taxAmount', 'El impuesto'], ['totalAmount', 'El importe total']]){
    const v = payload[key];
    if(v === undefined || v === null || v === '') continue;
    const n = Number(v);
    if(Number.isNaN(n) || n < 0) errors[key] = `${label} debe ser un número no negativo`;
  }
  if(!errors.subtotal && !errors.discount
    && subtotal !== undefined && subtotal !== null && subtotal !== ''
    && discount !== undefined && discount !== null && discount !== ''
    && Number(discount) > Number(subtotal)){
    errors.discount = 'El descuento no puede superar el subtotal';
  }
  validateLifecycleStatus((status||'').trim(), currentStatus, errors);
  if(Array.isArray(payload.lineasDetalle) && payload.lineasDetalle.length > 0){
    const lineCheck = validateLineasDetalle(payload.lineasDetalle);
    if(!lineCheck.valid) Object.assign(errors, lineCheck.errors);
  }
  Object.assign(errors, collectCustomErrors('document', payload));
  return { valid: Object.keys(errors).length === 0, errors };
}

function baseDocumentFields(payload, id, now){
  const user = currentUser();
  return {
    id,
    entity_id: payload.entityId,
    series: (payload.series||'').trim() || undefined,
    folio: Number(payload.folio),
    startDate: payload.startDate,
    endDate: payload.endDate,
    quantity: (isEmpty(payload.quantity)) ? undefined : Number(payload.quantity),
    subtotal: (isEmpty(payload.subtotal)) ? undefined : Number(payload.subtotal),
    discount: (isEmpty(payload.discount)) ? undefined : Number(payload.discount),
    taxAmount: (isEmpty(payload.taxAmount)) ? undefined : Number(payload.taxAmount),
    totalAmount: (isEmpty(payload.totalAmount)) ? undefined : Number(payload.totalAmount),
    currency: (payload.currency||'').trim() || undefined,
    paymentTerms: (payload.paymentTerms||'').trim() || undefined,
    notes: (payload.notes||'').trim() || undefined,
    status: (payload.status||'').trim() || undefined,
    createdBy: user ? user.id : undefined,
    createdByName: user ? user.name : undefined,
    ...pickCustomFields('document', payload),
    createdAt: now,
    updatedAt: now
  };
}

export function addDocument(payload){
  const now = new Date().toISOString();
  const check = validateDocument(payload);
  if(!check.valid){
    throw new Error(Object.values(check.errors)[0]);
  }
  const id = generateId();
  const document = baseDocumentFields(payload, id, now);
  if(Array.isArray(payload.lineasDetalle) && payload.lineasDetalle.length > 0){
    document.lineasDetalle = prepareLineas(payload.lineasDetalle, id);
    Object.assign(document, applyTotalesToCabecera(document, DEFAULT_TAX_RATE));
  }
  const list = loadDocuments();
  list.push(document);
  saveDocuments(list);
  return document;
}

export function updateDocument(id, updates){
  const list = loadDocuments();
  const idx = list.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const prev = list[idx];
  const merged = { ...prev, ...updates };
  const check = validateDocument({
    entityId: merged.entity_id,
    series: merged.series,
    folio: merged.folio,
    startDate: merged.startDate,
    endDate: merged.endDate,
    quantity: merged.quantity,
    subtotal: merged.subtotal,
    discount: merged.discount,
    taxAmount: merged.taxAmount,
    totalAmount: merged.totalAmount,
    status: updates.status !== undefined ? (updates.status||'').trim() : merged.status,
    lineasDetalle: updates.lineasDetalle !== undefined ? updates.lineasDetalle : prev.lineasDetalle
  }, prev.status);
  if(!check.valid){
    throw new Error(Object.values(check.errors)[0]);
  }
  const next = {
    ...prev,
    series: (merged.series||'').trim() || undefined,
    folio: Number(merged.folio),
    startDate: merged.startDate,
    endDate: merged.endDate,
    quantity: (isEmpty(merged.quantity)) ? undefined : Number(merged.quantity),
    subtotal: (isEmpty(merged.subtotal)) ? undefined : Number(merged.subtotal),
    discount: (isEmpty(merged.discount)) ? undefined : Number(merged.discount),
    taxAmount: (isEmpty(merged.taxAmount)) ? undefined : Number(merged.taxAmount),
    totalAmount: (isEmpty(merged.totalAmount)) ? undefined : Number(merged.totalAmount),
    currency: (merged.currency||'').trim() || undefined,
    paymentTerms: (merged.paymentTerms||'').trim() || undefined,
    notes: (merged.notes||'').trim() || undefined,
    status: updates.status !== undefined ? (updates.status||'').trim() : merged.status,
    ...pickCustomFields('document', { ...prev, ...updates }),
    updatedAt: new Date().toISOString()
  };
  if(updates.lineasDetalle !== undefined){
    if(Array.isArray(updates.lineasDetalle) && updates.lineasDetalle.length > 0){
      next.lineasDetalle = prepareLineas(updates.lineasDetalle, id);
      Object.assign(next, applyTotalesToCabecera(next, DEFAULT_TAX_RATE));
    } else {
      delete next.lineasDetalle;
    }
  }
  list[idx] = next;
  saveDocuments(list);
  return list[idx];
}

export function deleteDocument(id){
  const list = loadDocuments();
  const newList = list.filter(d => d.id !== id);
  saveDocuments(newList);
  return newList;
}

export function deleteDocumentsForEntity(entityId){
  const list = loadDocuments();
  const newList = list.filter(d => d.entity_id !== entityId);
  saveDocuments(newList);
  return newList;
}

// ---------------------------------------------------------------------------
// Aprobación y ciclo de vida de la Orden de Compra (HU3)
// ---------------------------------------------------------------------------

export function nextFolio(series){
  const nums = loadDocuments()
    .filter(d => (d.series || '') === series)
    .map(d => Number(d.folio))
    .filter(n => Number.isFinite(n));
  return nums.length ? Math.max(...nums) + 1 : 1001;
}

export function approveDocument(id){
  const docs = loadDocuments();
  const idx = docs.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const doc = docs[idx];
  const entity = loadEntities().find(e => e.entity_id === doc.entity_id);
  if(!entity) throw new Error('El proveedor del documento no existe');
  const missing = [];
  if(isEmpty(entity.taxId)) missing.push('taxId');
  if(isEmpty(entity.categoriaProveedor)) missing.push('categoriaProveedor');
  if(isEmpty(entity.paymentTerms)) missing.push('paymentTerms');
  if(entity.creditLimit === undefined || entity.creditLimit === null) missing.push('creditLimit');
  if(missing.length > 0){
    throw new Error(`Faltan datos comerciales del proveedor: ${missing.join(', ')}`);
  }
  const total = Number(doc.totalAmount !== undefined ? doc.totalAmount : doc.subtotal || 0);
  if(Number(total) > Number(entity.creditLimit)){
    throw new Error('El monto total excede el límite de crédito del proveedor');
  }
  docs[idx] = {
    ...doc,
    status: 'aprobado',
    series: 'OC',
    folio: nextFolio('OC'),
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveDocuments(docs);
  return docs[idx];
}

export function cancelDocument(id){
  const docs = loadDocuments();
  const idx = docs.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const doc = docs[idx];
  if(['recibido', 'facturado', 'cancelado'].includes(doc.status)){
    throw new Error(`No se puede cancelar un documento en estado "${doc.status}"`);
  }
  docs[idx] = { ...doc, status: 'cancelado', cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  saveDocuments(docs);
  return docs[idx];
}

// ---------------------------------------------------------------------------
// Solicitudes de compra (HU7 / HU4)
// ---------------------------------------------------------------------------

function normalizeRequisitionLines(lineas){
  if(!Array.isArray(lineas)) return [];
  return lineas.map(l => ({
    producto_id: String(l.producto_id || '').trim(),
    descripcion: String(l.descripcion || '').trim(),
    cantidad: Number(l.cantidad),
    unidadMedida: String(l.unidadMedida || 'unidades').trim() || 'unidades',
    precioEstimado: l.precioEstimado === undefined || l.precioEstimado === '' ? 0 : Number(l.precioEstimado)
  }));
}

export function validateRequisition(payload){
  const errors = {};
  if(isEmpty(payload.department)) errors.department = 'El departamento es obligatorio';
  if(isEmpty(payload.justification)) errors.justification = 'La justificación de la compra es obligatoria';
  const lineas = normalizeRequisitionLines(payload.lineasDetalle);
  if(lineas.length === 0) errors.lineasDetalle = 'Añade al menos un producto o servicio';
  lineas.forEach((l, i) => {
    const n = i + 1;
    if(!l.descripcion) errors[`linea-${i}-descripcion`] = `Línea ${n}: la descripción es obligatoria`;
    if(!Number.isFinite(l.cantidad) || l.cantidad <= 0) errors[`linea-${i}-cantidad`] = `Línea ${n}: la cantidad debe ser mayor que cero`;
    if(!Number.isFinite(l.precioEstimado) || l.precioEstimado < 0) errors[`linea-${i}-precioEstimado`] = `Línea ${n}: el precio estimado debe ser un número no negativo`;
  });
  return { valid: Object.keys(errors).length === 0, errors };
}

function nextRequisitionFolio(){
  const nums = loadRequisitions()
    .map(r => Number(String(r.folio || '').replace(/^SOL-/, '')))
    .filter(n => Number.isFinite(n));
  const n = nums.length ? Math.max(...nums) + 1 : 1001;
  return `SOL-${n}`;
}

export function requisitionTotal(requisition){
  const lineas = Array.isArray(requisition.lineasDetalle) ? requisition.lineasDetalle : [];
  return lineas.reduce((acc, l) => {
    const c = Number(l.cantidad);
    const p = Number(l.precioEstimado);
    return acc + (Number.isFinite(c) && Number.isFinite(p) ? c * p : 0);
  }, 0);
}

export function addRequisition(payload){
  const check = validateRequisition(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const user = currentUser();
  const now = new Date().toISOString();
  const requisition = {
    id: generateId(),
    folio: nextRequisitionFolio(),
    requesterId: user ? user.id : undefined,
    requesterName: (payload.requesterName || (user ? user.name : '')).trim(),
    department: String(payload.department).trim(),
    budgetLine: (payload.budgetLine || '').trim() || undefined,
    justification: String(payload.justification).trim(),
    lineasDetalle: normalizeRequisitionLines(payload.lineasDetalle),
    status: REQUISITION_STATUS.PENDING,
    rejectionReason: undefined,
    createdAt: now,
    updatedAt: now
  };
  const list = loadRequisitions();
  list.push(requisition);
  saveRequisitions(list);
  return requisition;
}

export function approveRequisition(id){
  const list = loadRequisitions();
  const idx = list.findIndex(r => r.id === id);
  if(idx === -1) throw new Error('Solicitud no encontrada');
  if(list[idx].status !== REQUISITION_STATUS.PENDING){
    throw new Error(`Solo se pueden aprobar solicitudes pendientes (estado actual: ${list[idx].status})`);
  }
  list[idx] = {
    ...list[idx],
    status: REQUISITION_STATUS.APPROVED,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveRequisitions(list);
  return list[idx];
}

export function rejectRequisition(id, reason){
  if(isEmpty(reason)) throw new Error('El motivo de rechazo es obligatorio');
  const list = loadRequisitions();
  const idx = list.findIndex(r => r.id === id);
  if(idx === -1) throw new Error('Solicitud no encontrada');
  if(list[idx].status !== REQUISITION_STATUS.PENDING){
    throw new Error(`Solo se pueden rechazar solicitudes pendientes (estado actual: ${list[idx].status})`);
  }
  list[idx] = {
    ...list[idx],
    status: REQUISITION_STATUS.REJECTED,
    rejectionReason: String(reason).trim(),
    rejectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveRequisitions(list);
  return list[idx];
}

export function pendingRequisitionsForDepartment(department){
  return loadRequisitions().filter(r =>
    r.status === REQUISITION_STATUS.PENDING && (!department || r.department === department)
  );
}

export function budgetForDepartment(department){
  const total = Number(DEPARTMENT_BUDGETS[department] || 0);
  const used = loadRequisitions()
    .filter(r => r.department === department && [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.APPROVED].includes(r.status))
    .reduce((acc, r) => acc + requisitionTotal(r), 0);
  return { total, used, available: Math.max(total - used, 0) };
}

// ---------------------------------------------------------------------------
// Recepción de productos (HU6)
// ---------------------------------------------------------------------------

export function ordersPendingReception(){
  return loadDocuments().filter(d => RECEPTION_ORDER_STATUSES.includes(d.status));
}

export function receivedQuantityForLine(orderId, lineIndex){
  return loadReceptions()
    .filter(r => r.orderId === orderId)
    .reduce((acc, r) => {
      const line = (r.lineas || []).find(l => l.ordenLineaIndex === lineIndex);
      const q = line ? Number(line.cantidadRecibida) : 0;
      return acc + (Number.isFinite(q) ? q : 0);
    }, 0);
}

export function pendingQuantityForLine(order, lineIndex){
  const line = (order.lineasDetalle || [])[lineIndex];
  if(!line) return 0;
  const requested = Number(line.cantidad) || 0;
  return Math.max(requested - receivedQuantityForLine(order.id, lineIndex), 0);
}

export function validateReception(payload){
  const errors = {};
  if(!can(PERMISSIONS.RECEPTIONS_MANAGE)) errors.role = 'Tu rol no permite registrar recepciones';
  const docs = loadDocuments();
  const order = docs.find(d => d.id === payload.orderId);
  if(!order) errors.orderId = 'La Orden de Compra no existe';
  else if(!RECEPTION_ORDER_STATUSES.includes(order.status)){
    errors.orderId = 'Solo se pueden recibir órdenes emitidas o parcialmente recibidas';
  }
  if(order && (!Array.isArray(payload.lineas) || payload.lineas.length === 0)){
    errors.lineas = 'Registra al menos una línea de recepción';
  }
  const lineas = Array.isArray(payload.lineas) ? payload.lineas : [];
  let hasMovement = false;
  lineas.forEach((l, i) => {
    const n = i + 1;
    const ordenLineaIndex = Number(l.ordenLineaIndex);
    const line = order && Array.isArray(order.lineasDetalle) ? order.lineasDetalle[ordenLineaIndex] : undefined;
    if(!line){ errors[`linea-${i}-ordenLineaIndex`] = `Línea ${n}: referencia inválida a la orden`; return; }
    const recibida = Number(l.cantidadRecibida);
    const rechazada = Number(l.cantidadRechazada === undefined || l.cantidadRechazada === '' ? 0 : l.cantidadRechazada);
    const pendiente = pendingQuantityForLine(order, ordenLineaIndex);
    if(!Number.isFinite(recibida) || recibida < 0) errors[`linea-${i}-cantidadRecibida`] = `Línea ${n}: la cantidad recibida debe ser un número no negativo`;
    else if(recibida > pendiente) errors[`linea-${i}-cantidadRecibida`] = `Línea ${n}: la cantidad recibida (${recibida}) supera la pendiente (${pendiente})`;
    if(!Number.isFinite(rechazada) || rechazada < 0) errors[`linea-${i}-cantidadRechazada`] = `Línea ${n}: la cantidad rechazada debe ser un número no negativo`;
    else if(Number.isFinite(recibida) && recibida + rechazada > Number(line.cantidad)) errors[`linea-${i}-cantidadRechazada`] = `Línea ${n}: recibida + rechazada supera la cantidad solicitada`;
    if(rechazada > 0 && isEmpty(l.motivoRechazo)) errors[`linea-${i}-motivoRechazo`] = `Línea ${n}: el motivo del rechazo es obligatorio`;
    if((Number.isFinite(recibida) && recibida > 0) || (Number.isFinite(rechazada) && rechazada > 0)) hasMovement = true;
  });
  if(!errors.lineas && !hasMovement) errors.lineas = 'Registra al menos una cantidad recibida o rechazada';
  return { valid: Object.keys(errors).length === 0, errors, order };
}

export function addReception(payload){
  const check = validateReception(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const order = check.order;
  const user = currentUser();
  const now = new Date().toISOString();
  const lineas = payload.lineas.map(l => {
    const idx = Number(l.ordenLineaIndex);
    const orderLine = order.lineasDetalle[idx];
    const recibida = Number(l.cantidadRecibida === undefined || l.cantidadRecibida === '' ? 0 : l.cantidadRecibida);
    const rechazada = Number(l.cantidadRechazada === undefined || l.cantidadRechazada === '' ? 0 : l.cantidadRechazada);
    return {
      ordenLineaIndex: idx,
      producto_id: orderLine.producto_id,
      descripcion: orderLine.descripcion,
      cantidadSolicitada: Number(orderLine.cantidad),
      cantidadRecibida: Number.isFinite(recibida) ? recibida : 0,
      cantidadRechazada: Number.isFinite(rechazada) ? rechazada : 0,
      motivoRechazo: rechazada > 0 ? String(l.motivoRechazo).trim() : undefined
    };
  });
  const reception = {
    id: generateId(),
    orderId: order.id,
    orderFolio: `${order.series ? `${order.series}-` : ''}${order.folio}`,
    fechaRecepcion: now,
    responsable: (payload.responsable || (user ? user.name : '')).trim(),
    observaciones: (payload.observaciones || '').trim() || undefined,
    estado: 'parcial',
    lineas,
    createdAt: now
  };
  const list = loadReceptions();
  list.push(reception);
  saveReceptions(list);
  updateOrderReceptionStatus(order.id);
  return loadReceptions().find(r => r.id === reception.id);
}

export function updateOrderReceptionStatus(orderId){
  const docs = loadDocuments();
  const idx = docs.findIndex(d => d.id === orderId);
  if(idx === -1) return;
  const order = docs[idx];
  const lineas = Array.isArray(order.lineasDetalle) ? order.lineasDetalle : [];
  if(lineas.length === 0) return;
  const complete = lineas.every((_, i) => pendingQuantityForLine(order, i) <= 0);
  docs[idx] = {
    ...order,
    status: complete ? 'recibido' : 'recibido parcialmente',
    recepcionEstado: complete ? 'completa' : 'parcial',
    updatedAt: new Date().toISOString()
  };
  saveDocuments(docs);
}

export function clearAll(){
  saveEntities([]);
  saveDocuments([]);
  saveUsers([]);
  saveRequisitions([]);
  saveReceptions([]);
}

export function searchEntities(term){
  const q = (term||'').trim().toLowerCase();
  if(!q) return loadEntities();
  const fields = ['name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'paymentTerms', ...declaredFields('entity').map(f => f.key)];
  return loadEntities().filter(e => fields.some(f => String(e[f] ?? '').toLowerCase().includes(q)));
}

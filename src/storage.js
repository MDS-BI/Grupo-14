import { getConfig, computeSubtotalLinea, applyTotalesToCabecera, DEFAULT_TAX_RATE } from './module-config.js';
import { can, currentUser, isAdmin, ROLE_KEYS, PERMISSIONS } from './auth.js';

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

export const DOCUMENT_STATUS = Object.freeze({
  APPROVED: 'Aprobada',
  ISSUED: 'Emitida',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  REJECTED: 'Rechazada',
  RECEIVED: 'Recibida'
});

// "Órdenes emitidas" del panel: toda orden que llegó a emitirse y no fue rechazada.
export const ISSUED_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED, DOCUMENT_STATUS.RECEIVED]);
export const FINAL_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.RECEIVED, DOCUMENT_STATUS.REJECTED]);
// Una orden con alguna recepción confirmada ya no puede rechazarse/cancelarse.
export const NON_CANCELLABLE_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.PARTIALLY_RECEIVED, ...FINAL_ORDER_STATUSES]);

export const DEPARTMENT_BUDGETS = Object.freeze({
  Operaciones: 100000,
  Compras: 150000,
  TI: 80000,
  General: 50000
});

export const DEPARTMENTS = Object.freeze(Object.keys(DEPARTMENT_BUDGETS));

const RECEPTION_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED]);
// Estados que solo se alcanzan registrando recepciones (FR-045, SC-013).
export const RECEPTION_DERIVED_STATUSES = Object.freeze([DOCUMENT_STATUS.PARTIALLY_RECEIVED, DOCUMENT_STATUS.RECEIVED]);

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

function isValidRut(value){
  const rut = String(value || '').trim();
  return /^\d{7,8}-[\dkK]$/.test(rut) || /^\d{1,2}(\.\d{3}){2}-[\dkK]$/.test(rut);
}

export function validateUser(payload, existingId){
  const errors = {};
  const username = String(payload.username || '').trim();
  const name = String(payload.name || '').trim();
  const role = String(payload.role || '').trim();
  const email = String(payload.email || '').trim();
  const rut = String(payload.rut || '').trim();
  const department = String(payload.department || '').trim();
  if(!username) errors.username = 'El usuario es obligatorio';
  else {
    const dup = loadUsers().some(u => u.id !== existingId && String(u.username).toLowerCase() === username.toLowerCase());
    if(dup) errors.username = 'El nombre de usuario ya existe';
  }
  if(!name) errors.name = 'El nombre es obligatorio';
  if(!ROLE_KEYS.includes(role)) errors.role = `El rol debe ser uno de: ${ROLE_KEYS.join(', ')}`;
  if(email && !isValidEmail(email)) errors.email = 'El correo electrónico no es válido';
  if(rut && !isValidRut(rut)) errors.rut = 'El RUT debe tener formato 12.345.678-9';
  if(department && !DEPARTMENTS.includes(department)) errors.department = `El departamento debe ser uno de: ${DEPARTMENTS.join(', ')}`;
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
    email: String(payload.email || '').trim(),
    rut: String(payload.rut || '').trim(),
    department: String(payload.department || '').trim(),
    role: String(payload.role).trim(),
    active: payload.active !== false,
    lastAccess: now,
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
    email: String(merged.email || '').trim(),
    rut: String(merged.rut || '').trim(),
    department: String(merged.department || '').trim(),
    role: String(merged.role).trim(),
    active: merged.active !== false,
    updatedAt: new Date().toISOString()
  };
  saveUsers(list);
  return list[idx];
}

export function usersWithPendingWork(userId){
  const requisitions = loadRequisitions().filter(r =>
    r.requesterId === userId && r.status === REQUISITION_STATUS.PENDING
  );
  const documents = loadDocuments().filter(d => d.createdBy === userId && !FINAL_ORDER_STATUSES.includes(d.status));
  return { requisitions: requisitions.length, documents: documents.length };
}

export function setUserActive(id, active){
  const list = loadUsers();
  const idx = list.findIndex(u => u.id === id);
  if(idx === -1) throw new Error('Usuario no encontrado');
  const next = Boolean(active);
  if(!next){
    const pending = usersWithPendingWork(id);
    if(pending.requisitions > 0 || pending.documents > 0){
      throw new Error('No se puede desactivar el usuario: tiene solicitudes u órdenes pendientes en su flujo. Reasigna o concluye esos trámites primero.');
    }
  }
  list[idx] = { ...list[idx], active: next, updatedAt: new Date().toISOString() };
  saveUsers(list);
  return list[idx];
}

export function deactivateUser(id){
  return setUserActive(id, false);
}

export function touchUserAccess(id){
  const list = loadUsers();
  const idx = list.findIndex(u => u.id === id);
  if(idx === -1) return null;
  const now = new Date().toISOString();
  list[idx] = { ...list[idx], lastAccess: now, updatedAt: now };
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
    estado: (payload.estado||'Activo').trim() || 'Activo',
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
    estado: (merged.estado||'Activo').trim() || 'Activo',
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
  const initialStatus = (payload.status || '').trim();
  if(RECEPTION_DERIVED_STATUSES.includes(initialStatus)){
    throw new Error(`El estado "${initialStatus}" solo se asigna al registrar recepciones de la orden`);
  }
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
  const nextStatus = updates.status !== undefined ? (updates.status||'').trim() : merged.status;
  if(nextStatus !== prev.status && RECEPTION_DERIVED_STATUSES.includes(nextStatus)){
    throw new Error(`El estado "${nextStatus}" solo se asigna al registrar recepciones de la orden`);
  }
  const check = validateDocument({
    ...merged,
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
  // Solo se emite desde "Aprobada"; un documento sin estado tampoco puede saltarse ese paso.
  if(doc.status !== DOCUMENT_STATUS.APPROVED){
    throw new Error(`Solo se pueden emitir órdenes en estado "${DOCUMENT_STATUS.APPROVED}" (estado actual: "${doc.status || 'sin estado'}")`);
  }
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
    status: DOCUMENT_STATUS.ISSUED,
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
  if(NON_CANCELLABLE_ORDER_STATUSES.includes(doc.status)){
    throw new Error(`No se puede rechazar un documento en estado "${doc.status}"`);
  }
  docs[idx] = { ...doc, status: DOCUMENT_STATUS.REJECTED, cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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

// T039: el aprobador solo decide sobre solicitudes de su departamento; el
// administrador puede decidir sobre cualquiera. Se valida aquí, no solo en la UI.
function assertCanDecideRequisition(requisition){
  if(!can(PERMISSIONS.REQUISITIONS_APPROVE)) throw new Error('Tu rol no permite aprobar o rechazar solicitudes');
  if(isAdmin()) return;
  const department = String((currentUser() || {}).department || '').trim();
  if(!department) throw new Error('Tu usuario no tiene un departamento asignado');
  if(requisition.department !== department){
    throw new Error('Solo puedes aprobar o rechazar solicitudes de tu departamento');
  }
}

export function approveRequisition(id){
  const list = loadRequisitions();
  const idx = list.findIndex(r => r.id === id);
  if(idx === -1) throw new Error('Solicitud no encontrada');
  assertCanDecideRequisition(list[idx]);
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
  assertCanDecideRequisition(list[idx]);
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
  const user = currentUser();
  const dept = String(department ?? (user && user.department) ?? '').trim();
  return loadRequisitions().filter(r =>
    r.status === REQUISITION_STATUS.PENDING && (!dept || r.department === dept)
  );
}

// Bandeja del aprobador de la sesión: su departamento; todos si es administrador;
// ninguno si no tiene permiso o no tiene departamento asignado.
export function pendingRequisitionsForApprover(){
  if(!can(PERMISSIONS.REQUISITIONS_APPROVE)) return [];
  if(isAdmin()) return pendingRequisitionsForDepartment();
  const department = String((currentUser() || {}).department || '').trim();
  return department ? pendingRequisitionsForDepartment(department) : [];
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
    errors.orderId = 'Solo se pueden recibir órdenes emitidas o recibidas parcialmente';
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
    status: complete ? DOCUMENT_STATUS.RECEIVED : DOCUMENT_STATUS.PARTIALLY_RECEIVED,
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

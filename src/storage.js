import { getConfig, applyTotalesToCabecera, computeSubtotalLinea } from './module-config.js';
import { ROLE_KEYS } from './auth.js';

const ENTITIES_KEY = 'erp_base_module:entities';
const DOCUMENTS_KEY = 'erp_base_module:documents';
const USERS_KEY = 'erp_base_module:users';
const RECEPTIONS_KEY = 'erp_base_module:receptions';

export const PENDING_STATUS = 'pendiente de aprobación';
export const REQUEST_TIPO = 'Solicitud de Cotización';

export function isRequestDocument(doc){
  if(!doc) return false;
  const tipo = String(doc.tipoDocumento || '').trim();
  return tipo === REQUEST_TIPO || justificacionRequired(tipo);
}

export function loadEntities(){
  try{
    const raw = localStorage.getItem(ENTITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Failed to parse entities from storage', e);
    return [];
  }
}

export function saveEntities(entities){
  localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
}

export function loadDocuments(){
  try{
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('Failed to parse documents from storage', e);
    return [];
  }
}

export function saveDocuments(documents){
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
}

function generateId(){
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

function declaredFields(target){
  return getConfig().customFields.filter(f => f.target === target);
}

function declaredLineaExtraFields(){
  const cfg = getConfig().lineasDetalle || {};
  return Array.isArray(cfg.camposExtra) ? cfg.camposExtra : [];
}

function justificacionRequired(tipoDocumento){
  const cfg = getConfig().justificacion;
  if(!cfg || !Array.isArray(cfg.requiredFor)) return false;
  return cfg.requiredFor.includes(String(tipoDocumento || '').trim());
}

function validateLineasDetalle(lineas, errors){
  if(lineas === undefined || lineas === null) return;
  if(!Array.isArray(lineas)){
    errors.lineasDetalle = 'Las líneas de detalle deben ser un arreglo';
    return;
  }
  const maxPct = Number(getConfig().lineasDetalle && getConfig().lineasDetalle.maxPorcentajeDescuento);
  const limite = Number.isFinite(maxPct) ? maxPct : 100;
  lineas.forEach((linea, index) => {
    const where = `Línea ${index + 1}`;
    if(!linea || typeof linea !== 'object'){
      errors.lineasDetalle = `${where}: debe ser un objeto`;
      return;
    }
    if(isEmpty(linea.producto_id)) errors.lineasDetalle = `${where}: el producto es obligatorio`;
    if(isEmpty(linea.descripcion)) errors.lineasDetalle = `${where}: la descripción es obligatoria`;
    if(isEmpty(linea.unidadMedida)) errors.lineasDetalle = `${where}: la unidad de medida es obligatoria`;
    const cantidad = Number(linea.cantidad);
    if(!Number.isFinite(cantidad) || cantidad <= 0){
      errors.lineasDetalle = `${where}: la cantidad debe ser un número estrictamente positivo`;
    }
    const precio = Number(linea.precioUnitario);
    if(!Number.isFinite(precio) || precio < 0){
      errors.lineasDetalle = `${where}: el precio unitario debe ser un número no negativo`;
    }
    if(!isEmpty(linea.porcentajeDescuentoLinea)){
      const pct = Number(linea.porcentajeDescuentoLinea);
      if(!Number.isFinite(pct) || pct < 0 || pct > limite){
        errors.lineasDetalle = `${where}: el descuento debe estar entre 0 y ${limite}`;
      }
    }
  });
}

function normalizeLinea(linea, documentoId){
  const extra = {};
  for(const field of declaredLineaExtraFields()){
    const value = linea[field.key];
    if(value === undefined || value === null || value === '') continue;
    extra[field.key] = field.type === 'number' ? Number(value) : String(value).trim();
  }
  const normalized = {
    id: linea.id || generateId(),
    documento_id: documentoId !== undefined ? documentoId : linea.documento_id,
    producto_id: String(linea.producto_id || '').trim(),
    descripcion: String(linea.descripcion || '').trim(),
    cantidad: Number(linea.cantidad),
    unidadMedida: String(linea.unidadMedida || '').trim(),
    precioUnitario: Number(linea.precioUnitario),
    porcentajeDescuentoLinea: isEmpty(linea.porcentajeDescuentoLinea) ? 0 : Number(linea.porcentajeDescuentoLinea),
    ...extra
  };
  normalized.subtotalLinea = computeSubtotalLinea(normalized);
  return normalized;
}

function normalizeLineas(lineas, documentoId){
  if(!Array.isArray(lineas)) return undefined;
  return lineas.map(linea => normalizeLinea(linea, documentoId));
}

function shouldComputeTotals(payload){
  return payload.recomputeTotals === true
    || (Array.isArray(payload.lineasDetalle) && payload.lineasDetalle.length > 0);
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
  if(currentStatus === PENDING_STATUS && ['aprobado', 'cancelado'].includes(status)) return;
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
  const normalizedStatus = (status||'').trim();
  const skippingLifecycle = normalizedStatus === PENDING_STATUS && isRequestDocument(payload);
  if(!skippingLifecycle){
    validateLifecycleStatus(normalizedStatus, currentStatus, errors);
  }
  if(justificacionRequired(payload.tipoDocumento) && isEmpty(payload.justificacion)){
    errors.justificacion = 'La justificación es obligatoria para solicitudes de cotización';
  }
  if(isRequestDocument(payload)){
    const deptField = getConfig().customFields.some(f => f.target === 'document' && f.key === 'departamento');
    if(deptField && isEmpty(payload.departamento)){
      errors.departamento = 'El departamento es obligatorio para las solicitudes';
    }
    if(!isEmpty(payload.presupuestoDisponible) && !isEmpty(payload.totalAmount)
      && Number(payload.totalAmount) > Number(payload.presupuestoDisponible)){
      errors.presupuestoDisponible = 'El monto solicitado supera el presupuesto disponible del departamento';
    }
  }
  validateLineasDetalle(payload.lineasDetalle, errors);
  Object.assign(errors, collectCustomErrors('document', payload));
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addDocument(payload){
  const now = new Date().toISOString();
  const check = validateDocument(payload);
  if(!check.valid){
    throw new Error(Object.values(check.errors)[0]);
  }
  let document = {
    id: generateId(),
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
    justificacion: (payload.justificacion||'').trim() || undefined,
    solicitante_id: payload.solicitante_id || undefined,
    aprobador_id: payload.aprobador_id || undefined,
    receptor_id: payload.receptor_id || undefined,
    ...pickCustomFields('document', payload),
    createdAt: now,
    updatedAt: now
  };
  const lineasDetalle = normalizeLineas(payload.lineasDetalle, document.id);
  if(lineasDetalle){
    lineasDetalle.forEach(linea => { linea.documento_id = document.id; });
    document.lineasDetalle = lineasDetalle;
  }
  if(shouldComputeTotals(payload)){
    const tasa = payload.tasaImpuesto !== undefined ? payload.tasaImpuesto : getConfig().tasaImpuesto;
    document = applyTotalesToCabecera(document, tasa);
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
    tipoDocumento: merged.tipoDocumento,
    justificacion: updates.justificacion !== undefined ? updates.justificacion : merged.justificacion,
    departamento: merged.departamento,
    presupuestoDisponible: merged.presupuestoDisponible,
    lineasDetalle: updates.lineasDetalle !== undefined ? updates.lineasDetalle : merged.lineasDetalle
  }, prev.status);
  if(!check.valid){
    throw new Error(Object.values(check.errors)[0]);
  }
  let next = {
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
    justificacion: (merged.justificacion||'').trim() || undefined,
    solicitante_id: merged.solicitante_id || undefined,
    aprobador_id: merged.aprobador_id || undefined,
    receptor_id: merged.receptor_id || undefined,
    ...pickCustomFields('document', { ...prev, ...updates }),
    updatedAt: new Date().toISOString()
  };
  if(updates.lineasDetalle !== undefined){
    next.lineasDetalle = normalizeLineas(updates.lineasDetalle, id);
  } else if(prev.lineasDetalle){
    next.lineasDetalle = prev.lineasDetalle;
  }
  if(updates.recomputeTotals === true
    || (Array.isArray(updates.lineasDetalle) && updates.lineasDetalle.length > 0)){
    const tasa = updates.tasaImpuesto !== undefined ? updates.tasaImpuesto : getConfig().tasaImpuesto;
    next = applyTotalesToCabecera(next, tasa);
  }
  list[idx] = next;
  saveDocuments(list);
  return next;
}

export function patchDocument(id, patch){
  const list = loadDocuments();
  const idx = list.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
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

export function clearAll(){
  saveEntities([]);
  saveDocuments([]);
  saveUsers([]);
  saveRecepciones([]);
}

export function loadUsers(){
  try{
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

export function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function validateUser({username, name, role, active = true}, { excludeId } = {}){
  const errors = {};
  if(isEmpty(username)) errors.username = 'El usuario es obligatorio';
  if(isEmpty(name)) errors.name = 'El nombre es obligatorio';
  if(isEmpty(role)) errors.role = 'El rol es obligatorio';
  else if(!ROLE_KEYS.includes(role)) errors.role = `El rol debe ser uno de: ${ROLE_KEYS.join(', ')}`;
  if(!isEmpty(username)){
    const duplicated = loadUsers().some(u => u.id !== excludeId
      && String(u.username).toLowerCase() === String(username).trim().toLowerCase());
    if(duplicated) errors.username = 'Ya existe un usuario con ese identificador';
  }
  return { valid: Object.keys(errors).length === 0, errors, active: active !== false };
}

export function addUser(payload){
  const check = validateUser(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const now = new Date().toISOString();
  const user = {
    id: generateId(),
    username: String(payload.username).trim(),
    name: String(payload.name).trim(),
    role: payload.role,
    departamento: String(payload.departamento || '').trim() || undefined,
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
  const check = validateUser(merged, { excludeId: id });
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  list[idx] = {
    ...list[idx],
    username: String(merged.username).trim(),
    name: String(merged.name).trim(),
    role: merged.role,
    departamento: String(merged.departamento || '').trim() || undefined,
    active: merged.active !== false,
    updatedAt: new Date().toISOString()
  };
  saveUsers(list);
  return list[idx];
}

export function deleteUser(id){
  const list = loadUsers();
  const newList = list.filter(u => u.id !== id);
  saveUsers(newList);
  return newList;
}

export function hasPendingWorkForUser(userId){
  return loadDocuments().some(doc => {
    if(['recibido', 'facturado', 'cancelado'].includes(doc.status)) return false;
    return doc.solicitante_id === userId || doc.aprobador_id === userId || doc.receptor_id === userId;
  });
}

export function deactivateUser(id){
  if(hasPendingWorkForUser(id)){
    throw new Error('El usuario tiene documentos pendientes asignados y no puede desactivarse');
  }
  return updateUser(id, { active: false });
}

export function pendingApprovalDocuments(){
  return loadDocuments().filter(doc => isRequestDocument(doc) && doc.status === PENDING_STATUS);
}

export function decideApproval(id, decision, { userId, comment } = {}){
  const list = loadDocuments();
  const idx = list.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const doc = list[idx];
  if(!isRequestDocument(doc) || doc.status !== PENDING_STATUS){
    throw new Error('El documento no está pendiente de aprobación');
  }
  if(!['aprobado', 'cancelado'].includes(decision)){
    throw new Error('Decisión de aprobación inválida');
  }
  const now = new Date().toISOString();
  list[idx] = {
    ...doc,
    status: decision,
    aprobaciones: [
      ...(doc.aprobaciones || []),
      { decision, userId: userId || null, comment: (comment || '').trim() || undefined, fecha: now }
    ],
    updatedAt: now
  };
  saveDocuments(list);
  return list[idx];
}

export function loadRecepciones(){
  try{
    const raw = localStorage.getItem(RECEPTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

export function saveRecepciones(recepciones){
  localStorage.setItem(RECEPTIONS_KEY, JSON.stringify(recepciones));
}

export function recepcionesForDocument(documentoId){
  return loadRecepciones().filter(r => r.documento_id === documentoId);
}

export function receivedQuantityForLine(documentoId, lineaId){
  return recepcionesForDocument(documentoId)
    .flatMap(r => r.lineas || [])
    .filter(l => l.linea_id === lineaId)
    .reduce((sum, l) => sum + Number(l.cantidadRecibida || 0), 0);
}

export function pendingQuantityForLine(documentoId, lineaId){
  const doc = loadDocuments().find(d => d.id === documentoId);
  if(!doc) return 0;
  const linea = (doc.lineasDetalle || []).find(l => l.id === lineaId);
  if(!linea) return 0;
  return Math.max(Number(linea.cantidad) - receivedQuantityForLine(documentoId, lineaId), 0);
}

export function validateRecepcion({documentoId, lineas, fechaRecepcion}){
  const errors = {};
  const doc = loadDocuments().find(d => d.id === documentoId);
  if(!doc) errors.documentoId = 'Selecciona una orden de compra válida';
  else if(!['aprobado', 'recibido'].includes(doc.status)){
    errors.documentoId = 'Solo se pueden recibir órdenes aprobadas';
  }
  if(!fechaRecepcion) errors.fechaRecepcion = 'La fecha de recepción es obligatoria';
  else if(!isValidDate(fechaRecepcion)) errors.fechaRecepcion = 'La fecha de recepción debe ser válida (YYYY-MM-DD)';
  if(!Array.isArray(lineas) || lineas.length === 0){
    errors.lineas = 'Agrega al menos una línea a la recepción';
  } else {
    lineas.forEach((linea, index) => {
      const where = `Línea ${index + 1}`;
      const original = doc ? (doc.lineasDetalle || []).find(l => l.id === linea.linea_id) : null;
      if(!original){ errors.lineas = `${where}: no pertenece a la orden`; return; }
      const cantidad = Number(linea.cantidadRecibida);
      if(!Number.isFinite(cantidad) || cantidad <= 0){
        errors.lineas = `${where}: la cantidad recibida debe ser mayor que cero`;
        return;
      }
      const pendiente = pendingQuantityForLine(documentoId, linea.linea_id);
      if(cantidad > pendiente){
        errors.lineas = `${where}: la cantidad recibida supera lo pendiente (${pendiente})`;
      }
    });
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addRecepcion(payload){
  const check = validateRecepcion(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const now = new Date().toISOString();
  const recepcion = {
    id: generateId(),
    documento_id: payload.documentoId,
    fechaRecepcion: payload.fechaRecepcion,
    notas: (payload.notas || '').trim() || undefined,
    lineas: payload.lineas.map(linea => ({
      linea_id: linea.linea_id,
      cantidadRecibida: Number(linea.cantidadRecibida)
    })),
    createdAt: now
  };
  const list = loadRecepciones();
  list.push(recepcion);
  saveRecepciones(list);

  const doc = loadDocuments().find(d => d.id === payload.documentoId);
  if(doc){
    const complete = (doc.lineasDetalle || []).length > 0
      && (doc.lineasDetalle || []).every(linea => pendingQuantityForLine(doc.id, linea.id) <= 0);
    const nextStatus = complete ? 'recibido' : doc.status;
    patchDocument(doc.id, { status: nextStatus });
  }
  return recepcion;
}

export function searchDocuments(term){
  const q = (term||'').trim().toLowerCase();
  if(!q) return loadDocuments();
  const fields = ['series', 'folio', 'status', 'currency', 'paymentTerms', 'notes', 'justificacion',
    ...declaredFields('document').map(f => f.key)];
  return loadDocuments().filter(doc => fields.some(field => String(doc[field] ?? '').toLowerCase().includes(q))
    || (doc.lineasDetalle || []).some(linea => String(linea.producto_id || '').toLowerCase().includes(q)
      || String(linea.descripcion || '').toLowerCase().includes(q)));
}

export function searchEntities(term){
  const q = (term||'').trim().toLowerCase();
  if(!q) return loadEntities();
  const fields = ['name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'paymentTerms', ...declaredFields('entity').map(f => f.key)];
  return loadEntities().filter(e => fields.some(f => String(e[f] ?? '').toLowerCase().includes(q)));
}

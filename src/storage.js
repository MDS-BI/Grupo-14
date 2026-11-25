import { getConfig, computeSubtotalLinea, subtotalFromLineas, applyTotalesToCabecera, DEFAULT_TAX_RATE } from './module-config.js';
import { can, currentUser, isAdmin, roleLabel, ROLE_KEYS, PERMISSIONS } from './auth.js';
import { cleanRut, formatRut, validateRut } from './rut.js';

export const SCHEMA_VERSION = 2;

const ENTITIES_KEY = 'erp_base_module:entities';
const DOCUMENTS_KEY = 'erp_base_module:documents';
const USERS_KEY = 'erp_base_module:users';
const REQUISITIONS_KEY = 'erp_base_module:requisitions';
const RECEPTIONS_KEY = 'erp_base_module:receptions';
const QUOTATIONS_KEY = 'erp_base_module:quotations';
const DEPARTMENTS_KEY = 'erp_base_module:departments';
const CATALOG_KEY = 'erp_base_module:catalog';
const BUDGETS_KEY = 'erp_base_module:budgets';
const AUDIT_KEY = 'erp_base_module:audit_events';
const DOMAIN_EVENT = 'erp-base-module:change';

const COLLECTION_KEYS = Object.freeze([
  ENTITIES_KEY, DOCUMENTS_KEY, USERS_KEY, REQUISITIONS_KEY,
  RECEPTIONS_KEY, QUOTATIONS_KEY, DEPARTMENTS_KEY, CATALOG_KEY,
  BUDGETS_KEY, AUDIT_KEY
]);

export const REQUISITION_STATUS = Object.freeze({
  PENDING: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  IN_QUOTATION: 'En cotización'
});

export const PENDING_STATUS = REQUISITION_STATUS.PENDING;

export const DOCUMENT_STATUS = Object.freeze({
  APPROVED: 'Aprobada',
  ISSUED: 'Emitida',
  PARTIALLY_RECEIVED: 'Recibida parcialmente',
  REJECTED: 'Rechazada',
  RECEIVED: 'Recibida',
  PAID: 'Pagada'
});

// "Órdenes emitidas" del panel: toda orden que llegó a emitirse y no fue rechazada.
export const ISSUED_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED, DOCUMENT_STATUS.RECEIVED]);
export const FINAL_ORDER_STATUSES = Object.freeze([DOCUMENT_STATUS.RECEIVED, DOCUMENT_STATUS.PAID, DOCUMENT_STATUS.REJECTED]);
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

export function searchDocuments(term){
  const query = String(term || '').trim().toLowerCase();
  if(!query) return [];
  return loadDocuments().filter(d =>
    [d.series, d.folio, d.justificacion, d.notes, d.status, d.entity_id]
      .some(value => String(value ?? '').toLowerCase().includes(query))
  );
}

export function loadUsers(){ return readJson(USERS_KEY, []); }
export function saveUsers(users){ writeJson(USERS_KEY, users); }

export function loadRequisitions(){ return readJson(REQUISITIONS_KEY, []); }
export function saveRequisitions(requisitions){ writeJson(REQUISITIONS_KEY, requisitions); }

export function loadReceptions(){ return readJson(RECEPTIONS_KEY, []); }
export function saveReceptions(receptions){ writeJson(RECEPTIONS_KEY, receptions); }

export function loadQuotations(){ return readJson(QUOTATIONS_KEY, []); }
export function saveQuotations(quotations){ writeJson(QUOTATIONS_KEY, quotations); }

function generateId(){
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

function roundMoney(value){
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function subscribeChanges(listener){
  if(typeof listener !== 'function') return () => {};
  const target = typeof window !== 'undefined' ? window : globalThis;
  if(target.addEventListener){
    target.addEventListener(DOMAIN_EVENT, listener);
    return () => target.removeEventListener(DOMAIN_EVENT, listener);
  }
  return () => {};
}

export function emitChange(type, detail = {}){
  const target = typeof window !== 'undefined' ? window : globalThis;
  const payload = { ...detail, at: new Date().toISOString() };
  if(target.dispatchEvent){
    const EventConstructor = target.Event || globalThis.Event;
    if(EventConstructor){
      const event = new EventConstructor(DOMAIN_EVENT);
      Object.assign(event, { detail: payload, domainType: type });
      target.dispatchEvent(event);
    }
  }
  return { domainType: type, detail: payload };
}

function actorInfo(){
  const user = currentUser();
  return {
    userId: user ? user.id : undefined,
    nombre: user ? user.name : undefined,
    rol: user ? roleLabel(user.role) : undefined
  };
}

export function appendAudit(event){
  if(!event || !event.action) throw new Error('El evento de auditoría debe indicar una acción');
  const now = new Date().toISOString();
  const actor = actorInfo();
  const record = {
    id: generateId(),
    tipo: 'EVENTO_DE_AUDITORIA',
    entidadTipo: event.entityType || 'documento',
    entidadId: event.entityId,
    accion: String(event.action),
    estadoAnterior: event.fromStatus,
    estadoNuevo: event.toStatus,
    revision: Number(event.revision || 1),
    motivo: event.reason ? String(event.reason).trim() : undefined,
    ...actor,
    at: now,
    createdAt: now
  };
  const list = loadAuditEvents();
  list.push(record);
  saveAuditEvents(list);
  emitChange('audit', { entityType: record.entidadTipo, entityId: record.entidadId });
  return record;
}

export function loadAuditEvents(){ return readJson(AUDIT_KEY, []); }
export function saveAuditEvents(events){ writeJson(AUDIT_KEY, events); }

export function auditForEntity(entityType, entityId){
  return loadAuditEvents()
    .filter(e => (!entityType || e.entidadTipo === entityType) && (!entityId || e.entidadId === entityId))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function assertFresh(current, expected, label = 'registro'){
  if(expected === undefined || expected === null || expected === '') return;
  if(Number(current && current.revision) !== Number(expected)){
    const error = new Error(`El ${label} cambió desde que lo abriste. Recarga o reintenta con la revisión vigente.`);
    error.code = 'REVISION_CONFLICT';
    error.current = current;
    throw error;
  }
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
// Departamentos, presupuestos y catálogo (US16 / US10 / US17)
// ---------------------------------------------------------------------------

export function loadDepartments(){ return readJson(DEPARTMENTS_KEY, []); }
export function saveDepartments(departments){ writeJson(DEPARTMENTS_KEY, departments); }

export function listDepartments(){
  const stored = loadDepartments().filter(d => d.active !== false);
  const names = stored.length ? stored.map(d => d.name) : DEPARTMENTS;
  return [...new Set(names)];
}

export function departmentOptions(){
  return loadDepartments().filter(d => d.active !== false).map(d => ({ value: d.name, label: d.name, approverId: d.approverId }));
}

export function approverForDepartment(department){
  const d = loadDepartments().find(x => x.name === department && x.active !== false);
  return d ? d.approverId : undefined;
}

export function validateDepartment(payload, existingId){
  const errors = {};
  const name = String(payload.name || '').trim();
  const code = String(payload.code || '').trim();
  if(!name) errors.name = 'El nombre del departamento es obligatorio';
  if(!code) errors.code = 'El código del departamento es obligatorio';
  else if(loadDepartments().some(d => d.id !== existingId && d.code.toUpperCase() === code.toUpperCase())){
    errors.code = 'El código del departamento ya está registrado';
  }
  if(payload.approverId && !loadUsers().some(u => u.id === payload.approverId && u.active !== false)){
    errors.approverId = 'El jefe aprobador debe ser un usuario activo';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addDepartment(payload){
  const check = validateDepartment(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const now = new Date().toISOString();
  const department = {
    id: generateId(),
    name: String(payload.name).trim(),
    code: String(payload.code).trim().toUpperCase(),
    approverId: payload.approverId || undefined,
    active: true,
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
  const list = loadDepartments();
  list.push(department);
  saveDepartments(list);
  appendAudit({ entityType: 'departamento', entityId: department.id, action: 'crear', toStatus: 'Activo', revision: 1 });
  emitChange('department', { id: department.id });
  return department;
}

export function updateDepartment(id, updates){
  const list = loadDepartments();
  const idx = list.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Departamento no encontrado');
  assertFresh(list[idx], updates.revision, 'departamento');
  const merged = { ...list[idx], ...updates };
  const check = validateDepartment(merged, id);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  if(merged.active === false) assertDepartmentCanDeactivate(id);
  list[idx] = {
    ...list[idx],
    name: String(merged.name).trim(),
    code: String(merged.code).trim().toUpperCase(),
    approverId: merged.approverId || undefined,
    active: merged.active !== false,
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveDepartments(list);
  appendAudit({ entityType: 'departamento', entityId: id, action: merged.active === false ? 'desactivar' : 'editar', revision: list[idx].revision });
  emitChange('department', { id });
  return list[idx];
}

export function assertDepartmentCanDeactivate(id){
  const department = loadDepartments().find(d => d.id === id);
  if(!department) throw new Error('Departamento no encontrado');
  if(loadUsers().some(u => u.department === department.name && u.active !== false)){
    throw new Error('No se puede desactivar el departamento: tiene usuarios activos asignados');
  }
  if(loadRequisitions().some(r => r.department === department.name && [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.IN_QUOTATION].includes(r.status))){
    throw new Error('No se puede desactivar el departamento: tiene solicitudes en curso');
  }
  if(Number((loadBudgets().find(b => b.department === department.name) || {}).committed || 0) > 0){
    throw new Error('No se puede desactivar el departamento: tiene presupuesto comprometido');
  }
}

export function loadBudgets(){ return readJson(BUDGETS_KEY, []); }
export function saveBudgets(budgets){ writeJson(BUDGETS_KEY, budgets); }

export function setDepartmentBudget(department, total, reason){
  const name = String(department || '').trim();
  const amount = Number(total);
  if(!name) throw new Error('El departamento es obligatorio');
  if(!Number.isFinite(amount) || amount < 0) throw new Error('El presupuesto debe ser un número no negativo');
  const list = loadBudgets();
  const idx = list.findIndex(b => b.department === name);
  const current = idx === -1 ? { department: name, total: 0, revision: 0 } : list[idx];
  assertFresh(current, current.revision, 'presupuesto');
  const next = { ...current, total: amount, revision: Number(current.revision || 1) + 1, updatedAt: new Date().toISOString() };
  if(idx === -1) list.push(next); else list[idx] = next;
  saveBudgets(list);
  appendAudit({ entityType: 'presupuesto', entityId: name, action: 'ajustar', reason, revision: next.revision, metadata: { total: amount } });
  emitChange('budget', { department: name });
  return next;
}

export function loadCatalog(){ return readJson(CATALOG_KEY, []); }
export function saveCatalog(items){ writeJson(CATALOG_KEY, items); }

export function validateCatalogItem(payload, existingId){
  const errors = {};
  const code = String(payload.code || '').trim();
  if(!code) errors.code = 'El código del producto es obligatorio';
  else if(loadCatalog().some(p => p.id !== existingId && p.code.toUpperCase() === code.toUpperCase())) errors.code = 'El código del producto ya está registrado';
  if(!String(payload.descripcion || '').trim()) errors.descripcion = 'La descripción es obligatoria';
  if(!String(payload.unidadMedida || '').trim()) errors.unidadMedida = 'La unidad de medida es obligatoria';
  const price = Number(payload.precioReferencia);
  if(!Number.isFinite(price) || price < 0) errors.precioReferencia = 'El precio de referencia debe ser un número no negativo';
  return { valid: Object.keys(errors).length === 0, errors };
}

export function addCatalogItem(payload){
  const check = validateCatalogItem(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const now = new Date().toISOString();
  const item = {
    id: generateId(),
    code: String(payload.code).trim().toUpperCase(),
    producto_id: String(payload.producto_id || payload.code).trim(),
    descripcion: String(payload.descripcion).trim(),
    categoria: String(payload.categoria || '').trim() || undefined,
    unidadMedida: String(payload.unidadMedida).trim(),
    precioReferencia: Number(payload.precioReferencia),
    active: true,
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
  const list = loadCatalog();
  list.push(item);
  saveCatalog(list);
  appendAudit({ entityType: 'catalogo', entityId: item.id, action: 'crear', revision: 1 });
  emitChange('catalog', { id: item.id });
  return item;
}

export function updateCatalogItem(id, updates){
  const list = loadCatalog();
  const idx = list.findIndex(p => p.id === id);
  if(idx === -1) throw new Error('Producto no encontrado');
  assertFresh(list[idx], updates.revision, 'producto');
  const merged = { ...list[idx], ...updates };
  const check = validateCatalogItem(merged, id);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  list[idx] = {
    ...list[idx],
    code: String(merged.code).trim().toUpperCase(),
    descripcion: String(merged.descripcion).trim(),
    categoria: String(merged.categoria || '').trim() || undefined,
    unidadMedida: String(merged.unidadMedida).trim(),
    precioReferencia: Number(merged.precioReferencia),
    active: merged.active !== false,
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveCatalog(list);
  emitChange('catalog', { id });
  return list[idx];
}

export function findCatalogItem(code){
  const key = String(code || '').trim().toUpperCase();
  if(!key) return undefined;
  return loadCatalog().find(p => p.active !== false && (p.code.toUpperCase() === key || String(p.producto_id).toUpperCase() === key));
}

export function duplicateCatalogRequests(lines){
  const counts = new Map();
  (lines || []).forEach(line => {
    const key = String(line.producto_id || '').trim().toUpperCase();
    if(key) counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

// ---------------------------------------------------------------------------
// Usuarios y permisos (HU1)
// ---------------------------------------------------------------------------

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
  if(rut){
    if(!validateRut(rut)) errors.rut = 'El RUT no es válido';
    else if(loadUsers().some(u => u.id !== existingId && cleanRut(u.rut) === cleanRut(rut))) errors.rut = 'El RUT ya está registrado';
  }
  if(department && !listDepartments().includes(department)) errors.department = `El departamento debe ser uno de: ${listDepartments().join(', ')}`;
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
    revision: 1,
    lastAccess: now,
    createdAt: now,
    updatedAt: now
  };
  const list = loadUsers();
  list.push(user);
  saveUsers(list);
  appendAudit({ entityType: 'usuario', entityId: user.id, action: 'crear', revision: 1 });
  emitChange('user', { id: user.id });
  return user;
}

export function updateUser(id, updates){
  const list = loadUsers();
  const idx = list.findIndex(u => u.id === id);
  if(idx === -1) throw new Error('Usuario no encontrado');
  assertFresh(list[idx], updates.revision, 'usuario');
  const merged = { ...list[idx], ...updates };
  if(merged.active === false){
    const pending = usersWithPendingWork(id);
    if(pending.requisitions > 0 || pending.documents > 0){
      throw new Error('No se puede desactivar el usuario: tiene solicitudes u órdenes pendientes en su flujo. Reasigna o concluye esos trámites primero.');
    }
  }
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
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveUsers(list);
  appendAudit({ entityType: 'usuario', entityId: id, action: merged.active === false ? 'desactivar' : 'editar', revision: list[idx].revision });
  emitChange('user', { id });
  return list[idx];
}

export function usersWithPendingWork(userId){
  const requisitions = loadRequisitions().filter(r =>
    r.requesterId === userId && [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.IN_QUOTATION].includes(r.status)
  );
  const documents = loadDocuments().filter(d =>
    [d.createdBy, d.solicitante_id, d.requesterId].includes(userId) && !FINAL_ORDER_STATUSES.includes(d.status)
  );
  return { requisitions: requisitions.length, documents: documents.length };
}

export function hasPendingWorkForUser(userId){
  const pending = usersWithPendingWork(userId);
  return pending.requisitions > 0 || pending.documents > 0;
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
  list[idx] = { ...list[idx], active: next, revision: Number(list[idx].revision || 1) + 1, updatedAt: new Date().toISOString() };
  saveUsers(list);
  appendAudit({ entityType: 'usuario', entityId: id, action: next ? 'activar' : 'desactivar', revision: list[idx].revision });
  emitChange('user', { id });
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

export function validateEntity({name, code, taxId, email, targetDate, creditLimit, ...rest}, existingId){
  const errors = {};
  if(!name || !name.trim()) errors.name = 'El nombre es obligatorio';
  if(!code || !code.trim()) errors.code = 'El código es obligatorio';
  const rut = String(taxId || '').trim();
  if(rut){
    if(!validateRut(rut)) errors.taxId = 'El RUT no es válido';
    else if(loadEntities().some(e => e.id !== existingId && cleanRut(e.taxId) === cleanRut(rut))) errors.taxId = 'El RUT ya está registrado';
  }
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

export function activeEntities(){
  return loadEntities().filter(e => e.active !== false && String(e.estado || '').toLowerCase() !== 'inactivo');
}

export function assertEntityCanDeactivate(id){
  const entity = loadEntities().find(e => e.id === id);
  if(!entity) throw new Error('Entidad no encontrada');
  const active = loadDocuments().filter(d =>
    [DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED].includes(d.status)
  );
  if(active.some(d => d.entity_id === entity.entity_id)){
    throw new Error('No se puede desactivar el proveedor: tiene Órdenes de Compra emitidas o recibidas parcialmente');
  }
}

export function setEntityActive(id, active){
  const next = Boolean(active);
  if(!next) assertEntityCanDeactivate(id);
  return updateEntity(id, { active: next, estado: next ? 'Activo' : 'Inactivo' });
}

function storedRut(value){
  const text = String(value || '').trim();
  if(!text) return undefined;
  const profileActive = getConfig().customFields.some(f => f.key === 'categoriaProveedor');
  return profileActive && validateRut(text) ? formatRut(text) : text;
}

export function addEntity(payload){
  const now = new Date().toISOString();
  const entity = {
    id: generateId(),
    entity_id: generateId(),
    name: (payload.name||'').trim(),
    code: (payload.code||'').trim(),
    taxId: storedRut(payload.taxId),
    email: (payload.email||'').trim() || undefined,
    phone: (payload.phone||'').trim() || undefined,
    address: (payload.address||'').trim() || undefined,
    category: (payload.category||'').trim() || undefined,
    description: (payload.description||'').trim() || undefined,
    targetDate: (payload.targetDate||'').trim() || undefined,
    creditLimit: isEmpty(payload.creditLimit) ? undefined : Number(payload.creditLimit),
    paymentTerms: (payload.paymentTerms||'').trim() || undefined,
    estado: (payload.estado||'Activo').trim() || 'Activo',
    active: payload.active !== false,
    ...pickCustomFields('entity', payload),
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
  const list = loadEntities();
  list.push(entity);
  saveEntities(list);
  appendAudit({ entityType: 'proveedor', entityId: entity.id, action: 'crear', toStatus: entity.estado, revision: 1 });
  emitChange('entity', { id: entity.id });
  return entity;
}

export function updateEntity(id, updates){
  const list = loadEntities();
  const idx = list.findIndex(e => e.id === id);
  if(idx === -1) throw new Error('Entidad no encontrada');
  assertFresh(list[idx], updates.revision, 'proveedor');
  const merged = { ...list[idx], ...updates };
  list[idx] = {
    ...list[idx],
    name: (merged.name||'').trim(),
    code: (merged.code||'').trim(),
    taxId: storedRut(merged.taxId),
    email: (merged.email||'').trim() || undefined,
    phone: (merged.phone||'').trim() || undefined,
    address: (merged.address||'').trim() || undefined,
    category: (merged.category||'').trim() || undefined,
    description: (merged.description||'').trim() || undefined,
    targetDate: (merged.targetDate||'').trim() || undefined,
    creditLimit: isEmpty(merged.creditLimit) ? undefined : Number(merged.creditLimit),
    paymentTerms: (merged.paymentTerms||'').trim() || undefined,
    estado: (merged.estado||'Activo').trim() || 'Activo',
    active: merged.active !== false && String(merged.estado || '').toLowerCase() !== 'inactivo',
    ...pickCustomFields('entity', merged),
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveEntities(list);
  appendAudit({ entityType: 'proveedor', entityId: id, action: list[idx].active === false ? 'desactivar' : 'editar', toStatus: list[idx].estado, revision: list[idx].revision });
  emitChange('entity', { id });
  return list[idx];
}

export function deleteEntity(id){
  const list = loadEntities();
  const entity = list.find(e => e.id === id);
  const newList = list.filter(e => e.id !== id);
  saveEntities(newList);
  if(entity){
    deleteDocumentsForEntity(entity.entity_id);
    appendAudit({ entityType: 'proveedor', entityId: id, action: 'eliminar', revision: Number(entity.revision || 1) });
    emitChange('entity', { id });
  }
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
  const lineas = Array.isArray(payload.lineasDetalle) ? payload.lineasDetalle : [];
  if(lineas.length > 0 && !errors.discount && discount !== undefined && discount !== null && discount !== ''){
    if(Number(discount) > subtotalFromLineas(lineas)){
      errors.discount = 'El descuento no puede superar el subtotal derivado de las líneas';
    }
  }
  if(!isEmpty(payload.tipoCambio)){
    const tc = Number(payload.tipoCambio);
    if(!Number.isFinite(tc) || tc < 0) errors.tipoCambio = 'El tipo de cambio debe ser un número no negativo';
  }
  const deliveryDate = payload.fechaEstimadaEntrega;
  if(!isEmpty(deliveryDate)){
    if(!isValidDate(deliveryDate)) errors.fechaEstimadaEntrega = 'La fecha estimada de entrega debe ser una fecha válida (YYYY-MM-DD)';
    else if(isValidDate(startDate) && deliveryDate < startDate) errors.fechaEstimadaEntrega = 'La fecha estimada de entrega no puede ser anterior a la fecha de inicio';
    else if(isValidDate(endDate) && deliveryDate > endDate) errors.fechaEstimadaEntrega = 'La fecha estimada de entrega no puede ser posterior a la fecha de fin';
  }
  const requiredFor = (getConfig().justificacion && getConfig().justificacion.requiredFor) || [];
  if(requiredFor.includes(String(payload.tipoDocumento || '').trim()) && isEmpty(payload.justificacion)){
    errors.justificacion = 'La justificación de la compra es obligatoria';
  }
  const requestPending = String(payload.tipoDocumento || '').trim() === 'Solicitud de Cotización'
    && String(status || '').trim() === PENDING_STATUS;
  if(!requestPending) validateLifecycleStatus((status||'').trim(), currentStatus, errors);
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
    justificacion: isEmpty(payload.justificacion) ? undefined : String(payload.justificacion).trim(),
    solicitante_id: payload.solicitante_id || payload.requesterId || undefined,
    createdBy: user ? user.id : undefined,
    createdByName: user ? user.name : undefined,
    ...pickCustomFields('document', payload),
    revision: 1,
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
    Object.assign(document, applyTotalesToCabecera(document, getConfig().taxRate ?? DEFAULT_TAX_RATE));
  }
  const list = loadDocuments();
  list.push(document);
  saveDocuments(list);
  appendAudit({ entityType: 'documento', entityId: id, action: 'crear', toStatus: document.status, revision: 1 });
  emitChange('document', { id });
  return document;
}

export function updateDocument(id, updates){
  const list = loadDocuments();
  const idx = list.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const prev = list[idx];
  assertFresh(prev, updates.revision, 'documento');
  if(prev.status === DOCUMENT_STATUS.PAID) throw new Error('La orden está Pagada y no permite edición posterior');
  const merged = { ...prev, ...updates };
  const nextStatus = updates.status !== undefined ? (updates.status||'').trim() : merged.status;
  if(updates.fechaEstimadaEntrega !== undefined && updates.fechaEstimadaEntrega !== prev.fechaEstimadaEntrega && isEmpty(updates.motivoCambioEntrega)){
    throw new Error('El cambio de fecha estimada de entrega requiere un motivo');
  }
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
    currency: (prev.currency||'').trim() || undefined,
    paymentTerms: (merged.paymentTerms||'').trim() || undefined,
    notes: (merged.notes||'').trim() || undefined,
    status: updates.status !== undefined ? (updates.status||'').trim() : merged.status,
    justificacion: isEmpty(merged.justificacion) ? undefined : String(merged.justificacion).trim(),
    ...pickCustomFields('document', { ...prev, ...updates }),
    tipoCambio: prev.tipoCambio,
    fechaEmision: prev.fechaEmision,
    revision: Number(prev.revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  if(updates.lineasDetalle !== undefined){
    if(Array.isArray(updates.lineasDetalle) && updates.lineasDetalle.length > 0){
      next.lineasDetalle = prepareLineas(updates.lineasDetalle, id);
      Object.assign(next, applyTotalesToCabecera(next, getConfig().taxRate ?? DEFAULT_TAX_RATE));
    } else {
      delete next.lineasDetalle;
    }
  }
  list[idx] = next;
  saveDocuments(list);
  appendAudit({ entityType: 'documento', entityId: id, action: 'editar', fromStatus: prev.status, toStatus: next.status, reason: updates.motivoCambioEntrega, revision: next.revision });
  if(prev.fechaEstimadaEntrega !== next.fechaEstimadaEntrega){
    appendAudit({ entityType: 'documento', entityId: id, action: 'cambiar_fecha_entrega', fromStatus: prev.fechaEstimadaEntrega, toStatus: next.fechaEstimadaEntrega, reason: updates.motivoCambioEntrega, revision: next.revision });
  }
  emitChange('document', { id });
  return list[idx];
}

export function deleteDocument(id){
  const list = loadDocuments();
  const doc = list.find(d => d.id === id);
  const newList = list.filter(d => d.id !== id);
  saveDocuments(newList);
  if(doc){
    appendAudit({ entityType: 'documento', entityId: id, action: 'eliminar', fromStatus: doc.status, revision: Number(doc.revision || 1) });
    emitChange('document', { id });
  }
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
    fechaEmision: doc.fechaEmision || new Date().toISOString().slice(0, 10),
    revision: Number(doc.revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveDocuments(docs);
  appendAudit({ entityType: 'documento', entityId: id, action: 'aprobar_emision', fromStatus: DOCUMENT_STATUS.APPROVED, toStatus: DOCUMENT_STATUS.ISSUED, revision: docs[idx].revision });
  emitChange('document', { id });
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
  docs[idx] = {
    ...doc,
    status: DOCUMENT_STATUS.REJECTED,
    cancelledAt: new Date().toISOString(),
    revision: Number(doc.revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveDocuments(docs);
  appendAudit({ entityType: 'documento', entityId: id, action: 'cancelar', fromStatus: doc.status, toStatus: DOCUMENT_STATUS.REJECTED, revision: docs[idx].revision });
  emitChange('document', { id });
  return docs[idx];
}

export function patchDocument(id, updates){
  const docs = loadDocuments();
  const idx = docs.findIndex(d => d.id === id);
  if(idx === -1) throw new Error('Documento no encontrado');
  const prev = docs[idx];
  docs[idx] = { ...prev, ...updates, revision: Number(prev.revision || 1) + 1, updatedAt: new Date().toISOString() };
  saveDocuments(docs);
  appendAudit({ entityType: 'documento', entityId: id, action: updates.status && updates.status !== prev.status ? 'cambiar_estado' : 'actualizar', fromStatus: prev.status, toStatus: updates.status, revision: docs[idx].revision });
  emitChange('document', { id });
  return docs[idx];
}

export function isRequestDocument(doc){
  return Boolean(doc) && (doc.tipoDocumento === 'Solicitud de Cotización' || doc.status === PENDING_STATUS);
}

export function decideApproval(id, status, { userId, comment } = {}){
  const doc = loadDocuments().find(d => d.id === id);
  if(!doc) throw new Error('La solicitud no existe');
  const decision = {
    userId,
    comment: String(comment || '').trim() || undefined,
    status,
    at: new Date().toISOString()
  };
  return patchDocument(id, {
    status,
    aprobaciones: [...(Array.isArray(doc.aprobaciones) ? doc.aprobaciones : []), decision]
  });
}

export function creditUsedForEntity(entityId){
  const entity = loadEntities().find(e => e.entity_id === entityId);
  if(!entity) return 0;
  return loadDocuments()
    .filter(d => d.entity_id === entityId && [DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED, DOCUMENT_STATUS.RECEIVED, DOCUMENT_STATUS.PAID].includes(d.status))
    .reduce((acc, d) => acc + (Number(d.montoPagado ?? d.totalAmount ?? d.subtotal ?? 0) || 0), 0);
}

export function availableCreditForEntity(entityId){
  const entity = loadEntities().find(e => e.entity_id === entityId);
  if(!entity) return 0;
  return Math.max(Number(entity.creditLimit || 0) - creditUsedForEntity(entityId), 0);
}

export function receivedTotalForOrder(order){
  if(!order) return 0;
  const receptions = loadReceptions().filter(r => r.orderId === order.id);
  if(receptions.length === 0) return Number(order.totalAmount ?? order.subtotal ?? 0);
  const lineas = Array.isArray(order.lineasDetalle) ? order.lineasDetalle : [];
  return roundMoney(receptions.reduce((acc, reception) => {
    return acc + (reception.lineas || []).reduce((sum, line) => {
      const orderLine = lineas[Number(line.ordenLineaIndex)] || {};
      const price = Number(orderLine.precioUnitario || 0);
      const net = Number(line.cantidadRecibida || 0) - Number(line.cantidadRechazada || 0);
      return sum + net * price;
    }, 0);
  }, 0));
}

export function payOrder(id, { factura, monto, fechaPago, nota, revision } = {}){
  const doc = loadDocuments().find(d => d.id === id);
  if(!doc) throw new Error('Orden de compra no encontrada');
  assertFresh(doc, revision, 'orden de compra');
  if(doc.status !== DOCUMENT_STATUS.RECEIVED){
    throw new Error(`Solo se puede pagar una orden recibida por completo (estado actual: "${doc.status || 'sin estado'}")`);
  }
  if(isEmpty(factura)) throw new Error('El folio de la factura es obligatorio');
  if(!isValidDate(fechaPago)) throw new Error('La fecha de pago debe ser una fecha válida (YYYY-MM-DD)');
  const amount = Number(monto);
  if(!Number.isFinite(amount) || amount <= 0) throw new Error('El monto facturado debe ser un número positivo');
  const expected = receivedTotalForOrder(doc);
  const difference = roundMoney(amount - expected);
  if(Math.abs(difference) > 0.01 && isEmpty(nota)){
    throw new Error(`El monto facturado debe coincidir con el total recepcionado; diferencia de ${Math.abs(difference).toFixed(2)} CLP. Corrige el monto o registra una nota de ajuste.`);
  }
  return patchDocument(id, {
    status: DOCUMENT_STATUS.PAID,
    factura: String(factura).trim(),
    fechaPago,
    montoPagado: amount,
    totalRecepcionado: expected,
    diferenciaPago: difference,
    notaAjuste: isEmpty(nota) ? undefined : String(nota).trim()
  });
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
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
  const list = loadRequisitions();
  list.push(requisition);
  saveRequisitions(list);
  appendAudit({ entityType: 'solicitud', entityId: requisition.id, action: 'crear', toStatus: REQUISITION_STATUS.PENDING, revision: 1 });
  emitChange('requisition', { id: requisition.id });
  return requisition;
}

// T039: el aprobador solo decide sobre solicitudes de su departamento; el
// administrador puede decidir sobre cualquiera. Se valida aquí, no solo en la UI.
function assertCanDecideRequisition(requisition){
  if(!can(PERMISSIONS.REQUISITIONS_APPROVE)) throw new Error('Tu rol no permite aprobar o rechazar solicitudes');
  if(isAdmin()) return;
  const user = currentUser() || {};
  const department = String(user.department || '').trim();
  if(!department) throw new Error('Tu usuario no tiene un departamento asignado');
  if(requisition.department !== department){
    throw new Error('Solo puedes aprobar o rechazar solicitudes de tu departamento');
  }
  const approverId = approverForDepartment(department);
  if(approverId && approverId !== user.id){
    throw new Error('No eres el jefe aprobador asignado a este departamento');
  }
}

export function approveRequisition(id, options = {}){
  const { overrideReason } = options;
  const list = loadRequisitions();
  const idx = list.findIndex(r => r.id === id);
  if(idx === -1) throw new Error('Solicitud no encontrada');
  assertCanDecideRequisition(list[idx]);
  assertFresh(list[idx], options.revision, 'solicitud');
  if(list[idx].status !== REQUISITION_STATUS.PENDING){
    throw new Error(`Solo se pueden aprobar solicitudes pendientes (estado actual: ${list[idx].status})`);
  }
  const total = requisitionTotal(list[idx]);
  const budget = budgetForDepartment(list[idx].department);
  const overBudget = total > budget.available;
  if(overBudget){
    if(!isAdmin()) throw new Error('El departamento no tiene saldo disponible; se requiere override administrativo');
    if(isEmpty(overrideReason)) throw new Error('El override administrativo requiere un motivo');
  }
  list[idx] = {
    ...list[idx],
    status: REQUISITION_STATUS.APPROVED,
    approvedAt: new Date().toISOString(),
    budgetOverride: overBudget ? String(overrideReason).trim() : undefined,
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveRequisitions(list);
  appendAudit({
    entityType: 'solicitud',
    entityId: id,
    action: overBudget ? 'aprobar_con_override' : 'aprobar',
    fromStatus: REQUISITION_STATUS.PENDING,
    toStatus: REQUISITION_STATUS.APPROVED,
    reason: overBudget ? overrideReason : undefined,
    revision: list[idx].revision
  });
  emitChange('requisition', { id });
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
    revision: Number(list[idx].revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveRequisitions(list);
  appendAudit({
    entityType: 'solicitud',
    entityId: id,
    action: 'rechazar',
    fromStatus: REQUISITION_STATUS.PENDING,
    toStatus: REQUISITION_STATUS.REJECTED,
    reason,
    revision: list[idx].revision
  });
  emitChange('requisition', { id });
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
  const configured = loadBudgets().find(b => b.department === department);
  const hasBudget = Boolean(configured) || DEPARTMENT_BUDGETS[department] !== undefined;
  const total = Number(configured ? configured.total : (DEPARTMENT_BUDGETS[department] || 0));
  const used = loadRequisitions()
    .filter(r => r.department === department && [REQUISITION_STATUS.PENDING, REQUISITION_STATUS.APPROVED, REQUISITION_STATUS.IN_QUOTATION].includes(r.status))
    .reduce((acc, r) => acc + requisitionTotal(r), 0);
  const available = hasBudget ? Math.max(total - used, 0) : 0;
  return { total, used, available, overBudget: hasBudget && used > total, committed: used };
}

export function isOverBudget(department){
  return budgetForDepartment(department).overBudget;
}

export function pendingQuotationRequisitions(){
  const quoted = new Set(loadQuotations().map(q => q.requisitionId));
  return loadRequisitions().filter(r => r.status === REQUISITION_STATUS.APPROVED && !quoted.has(r.id));
}

export function quotationsForRequisition(requisitionId){
  return loadQuotations().filter(q => q.requisitionId === requisitionId);
}

export function validateQuotation(payload){
  const errors = {};
  const requisition = loadRequisitions().find(r => r.id === payload.requisitionId);
  if(!requisition) errors.requisitionId = 'La solicitud autorizada no existe';
  else if(quotationsForRequisition(requisition.id).length > 0) errors.requisitionId = 'Esta solicitud ya tiene una cotización generada';
  else if(requisition.status !== REQUISITION_STATUS.APPROVED) errors.requisitionId = 'La solicitud no está autorizada para cotizar';

  const entity = loadEntities().find(e => e.entity_id === payload.entityId);
  if(!entity) errors.entityId = 'Selecciona un proveedor para la cotización';
  else {
    if(entity.active === false || String(entity.estado || '').toLowerCase() === 'inactivo') errors.entityId = 'El proveedor seleccionado no está activo';
    const missing = ['taxId', 'categoriaProveedor', 'paymentTerms', 'creditLimit'].filter(key => isEmpty(entity[key]));
    if(missing.length > 0) errors.entity = `Faltan datos comerciales del proveedor: ${missing.join(', ')}`;
  }

  const lineas = Array.isArray(payload.lineas) ? payload.lineas : [];
  if(requisition && lineas.length !== (requisition.lineasDetalle || []).length){
    errors.lineas = 'Indica el precio unitario de cada línea de la solicitud';
  }
  lineas.forEach((l, i) => {
    const price = Number(l && l.precioUnitario);
    if(!Number.isFinite(price) || price < 0) errors[`linea-${i}-precioUnitario`] = `Línea ${i + 1}: el precio unitario debe ser un número no negativo`;
  });
  return { valid: Object.keys(errors).length === 0, errors, requisition, entity };
}

export function createQuotation(payload){
  const check = validateQuotation(payload);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);
  const { requisition, entity } = check;
  assertFresh(requisition, payload.revision, 'solicitud');
  if(!can(PERMISSIONS.ORDERS_CREATE)) throw new Error('Tu rol no permite generar cotizaciones');
  const user = currentUser();
  const now = new Date().toISOString();
  const lineas = payload.lineas.map((l, i) => {
    const requisitionLine = requisition.lineasDetalle[i];
    const precioUnitario = Number(l.precioUnitario);
    return {
      producto_id: requisitionLine.producto_id,
      descripcion: requisitionLine.descripcion,
      cantidad: Number(requisitionLine.cantidad),
      unidadMedida: requisitionLine.unidadMedida,
      precioUnitario,
      subtotalLinea: computeSubtotalLinea({ cantidad: requisitionLine.cantidad, precioUnitario })
    };
  });
  const quotation = {
    id: generateId(),
    folio: nextFolio('SC'),
    series: 'SC',
    requisitionId: requisition.id,
    requisitionFolio: requisition.folio,
    entityId: entity.entity_id,
    proveedor: entity.name,
    tipoDocumento: 'Solicitud de Cotización',
    estado: REQUISITION_STATUS.IN_QUOTATION,
    justificacion: requisition.justification,
    departamento: requisition.department,
    lineasDetalle: lineas,
    createdBy: user ? user.id : undefined,
    revision: 1,
    createdAt: now,
    updatedAt: now
  };
  Object.assign(quotation, applyTotalesToCabecera(quotation, getConfig().taxRate ?? DEFAULT_TAX_RATE));
  const list = loadQuotations();
  list.push(quotation);
  saveQuotations(list);
  const requisitions = loadRequisitions();
  const idx = requisitions.findIndex(r => r.id === requisition.id);
  requisitions[idx] = {
    ...requisitions[idx],
    status: REQUISITION_STATUS.IN_QUOTATION,
    quotationId: quotation.id,
    revision: Number(requisitions[idx].revision || 1) + 1,
    updatedAt: now
  };
  saveRequisitions(requisitions);
  appendAudit({
    entityType: 'solicitud',
    entityId: requisition.id,
    action: 'generar_cotizacion',
    fromStatus: REQUISITION_STATUS.APPROVED,
    toStatus: REQUISITION_STATUS.IN_QUOTATION,
    revision: requisitions[idx].revision
  });
  appendAudit({ entityType: 'cotizacion', entityId: quotation.id, action: 'crear', revision: 1 });
  emitChange('quotation', { id: quotation.id });
  return quotation;
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
  const current = docs.find(d => d.id === payload.orderId);
  if(current && payload.revision !== undefined && payload.revision !== null && payload.revision !== ''){
    assertFresh(current, payload.revision, 'orden de compra');
  }
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
    else if(Number.isFinite(recibida) && recibida + rechazada > pendiente) errors[`linea-${i}-cantidadRechazada`] = `Línea ${n}: recibida + rechazada supera la cantidad pendiente (${pendiente})`;
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
    revision: 1,
    createdAt: now
  };
  const list = loadReceptions();
  list.push(reception);
  saveReceptions(list);
  updateOrderReceptionStatus(order.id);
  const saved = loadReceptions().find(r => r.id === reception.id);
  const updatedOrder = loadDocuments().find(d => d.id === order.id);
  appendAudit({
    entityType: 'documento',
    entityId: order.id,
    action: 'registrar_recepcion',
    fromStatus: order.status,
    toStatus: updatedOrder ? updatedOrder.status : undefined,
    revision: updatedOrder ? Number(updatedOrder.revision || 1) : 1
  });
  emitChange('reception', { id: saved.id });
  return saved;
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
    revision: Number(order.revision || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  saveDocuments(docs);
}

export function clearAll(){
  COLLECTION_KEYS.forEach(key => localStorage.removeItem(key));
}

export function searchEntities(term){
  const q = (term||'').trim().toLowerCase();
  if(!q) return loadEntities();
  const fields = ['name', 'code', 'taxId', 'email', 'phone', 'address', 'category', 'description', 'targetDate', 'paymentTerms', ...declaredFields('entity').map(f => f.key)];
  return loadEntities().filter(e => fields.some(f => String(e[f] ?? '').toLowerCase().includes(q)));
}

// ---------------------------------------------------------------------------
// Entrega, exportación y respaldo (US18 / US14)
// ---------------------------------------------------------------------------

export function isOrderOverdue(order, now = new Date()){
  const date = order && order.fechaEstimadaEntrega;
  if(!isValidDate(date)) return false;
  if(FINAL_ORDER_STATUSES.includes(order.status)) return false;
  const today = typeof now === 'string' ? now.slice(0, 10) : new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return date < today;
}

export function overdueOrders(now){
  return loadDocuments().filter(d => ISSUED_ORDER_STATUSES.includes(d.status) && isOrderOverdue(d, now));
}

export function monthSpend(now = new Date()){
  const prefix = (typeof now === 'string' ? now : new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString()).slice(0, 7);
  return roundMoney(loadDocuments()
    .filter(d => [DOCUMENT_STATUS.ISSUED, DOCUMENT_STATUS.PARTIALLY_RECEIVED, DOCUMENT_STATUS.RECEIVED, DOCUMENT_STATUS.PAID].includes(d.status)
      && String(d.createdAt || '').slice(0, 7) === prefix)
    .reduce((acc, d) => acc + Number(d.totalAmount ?? d.subtotal ?? 0), 0));
}

export function dashboardMetrics(now){
  const docs = loadDocuments();
  return {
    entities: loadEntities().length,
    documents: docs.length,
    pendingApprovals: pendingRequisitionsForApprover().length,
    issuedOrders: docs.filter(d => ISSUED_ORDER_STATUSES.includes(d.status)).length,
    overdueOrders: overdueOrders(now).length,
    monthSpend: monthSpend(now),
    pendingReceptions: ordersPendingReception().length
  };
}

function csvCell(value){
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportDocumentsCsv(documents = loadDocuments()){
  const header = ['serie', 'folio', 'proveedor', 'estado', 'fechaInicio', 'fechaFin', 'fechaEntrega', 'subtotal', 'descuento', 'impuesto', 'total', 'factura', 'fechaPago'];
  const rows = documents.map(doc => {
    const entity = loadEntities().find(e => e.entity_id === doc.entity_id);
    return [
      doc.series, doc.folio, entity ? entity.name : '', doc.status,
      doc.startDate, doc.endDate, doc.fechaEstimadaEntrega,
      doc.subtotal, doc.discount, doc.taxAmount, doc.totalAmount,
      doc.factura, doc.fechaPago
    ];
  });
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

export function printableDocument(orderId){
  const doc = loadDocuments().find(d => d.id === orderId);
  if(!doc) throw new Error('Documento no encontrado');
  const entity = loadEntities().find(e => e.entity_id === doc.entity_id);
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const lineas = (doc.lineasDetalle || []).map(l => `<tr><td>${esc(l.producto_id)}</td><td>${esc(l.descripcion)}</td><td>${esc(l.cantidad)}</td><td>${esc(l.unidadMedida)}</td><td>${esc(l.precioUnitario)}</td><td>${esc(l.subtotalLinea)}</td></tr>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(`${doc.series || ''}-${doc.folio || ''}`)}</title></head><body><h1>${esc(doc.series || 'Documento')} ${esc(doc.folio || '')}</h1><p>Proveedor: ${esc(entity ? entity.name : '')}</p><p>Estado: ${esc(doc.status || '')}</p><p>Fecha estimada de entrega: ${esc(doc.fechaEstimadaEntrega || 'No registrada')}</p><p>Dirección: ${esc(doc.direccionEntrega || 'No registrada')}</p><p>Instrucciones: ${esc(doc.instruccionesDespacho || 'No registradas')}</p><table><thead><tr><th>Producto</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>${lineas}</tbody></table><p>Total: ${esc(doc.totalAmount ?? doc.subtotal ?? 0)}</p></body></html>`;
}

export function createBackup(){
  const backup = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString() };
  COLLECTION_KEYS.forEach(key => { backup[key] = readJson(key, []); });
  return backup;
}

function backupCollection(backup, key){
  if(!Array.isArray(backup[key])) throw new Error(`El respaldo no contiene una colección válida: ${key}`);
  return backup[key];
}

export function validateBackup(backup){
  if(!backup || typeof backup !== 'object') throw new Error('El respaldo debe ser un objeto JSON');
  if(Number(backup.schemaVersion) !== SCHEMA_VERSION) throw new Error(`Versión de esquema no soportada: ${backup.schemaVersion}`);
  COLLECTION_KEYS.forEach(key => backupCollection(backup, key));
  const entities = backup[ENTITIES_KEY];
  const seenRuts = new Set();
  entities.forEach(e => {
    if(!e || !e.name || !e.code) throw new Error('El respaldo contiene proveedores incompletos');
    if(e.taxId){
      const rut = cleanRut(e.taxId);
      if(!validateRut(rut)) throw new Error(`El respaldo contiene un RUT inválido: ${e.taxId}`);
      if(seenRuts.has(rut)) throw new Error('El respaldo contiene RUT duplicados');
      seenRuts.add(rut);
    }
  });
  const folios = new Set();
  backup[DOCUMENTS_KEY].forEach(d => {
    if(!d || !Number.isInteger(Number(d.folio))) throw new Error('El respaldo contiene folios inválidos');
    const key = `${d.series || ''}-${d.folio}`;
    if(folios.has(key)) throw new Error('El respaldo contiene folios duplicados');
    folios.add(key);
    if(d.entity_id && !entities.some(e => e.entity_id === d.entity_id)) throw new Error('El respaldo contiene documentos huérfanos');
  });
  return backup;
}

export function restoreBackup(backup){
  validateBackup(backup);
  COLLECTION_KEYS.forEach(key => writeJson(key, backup[key]));
  emitChange('restore', {});
  return true;
}

import { loadModuleConfig, normalizeConfig, setActiveConfig, labelFor } from './module-config.js';
import {
  loadEntities, addEntity, updateEntity, deleteEntity, validateEntity, searchEntities,
  loadDocuments, addDocument, updateDocument, deleteDocument, validateDocument,
  loadUsers, addUser, updateUser, setUserActive, touchUserAccess, validateUser,
  loadRequisitions, addRequisition, validateRequisition, approveRequisition, rejectRequisition,
  pendingRequisitionsForApprover, budgetForDepartment,
  ordersPendingReception, addReception, validateReception,
  approveDocument, cancelDocument
} from './storage.js';
import { can, isAdmin, setSession, resetSession, getSession, PERMISSIONS, roleLabel } from './auth.js';
import { attachRutFormatting } from './rut.js';
import { ensureMockData, injectMockData } from './mock-data.js';
import { clearEntityForm, startEntityEdit, collectEntityPayload, showEntityErrors } from './components/entity-form.js';
import { createEntityItem, filterEntities, renderEntityTable, renderEntityDetail } from './components/entity-list.js';
import { clearDocumentForm, startDocumentEdit, collectDocumentPayload, showDocumentErrors, addDocumentDetailLine, toggleOrderActions } from './components/document-form.js';
import { syncDocumentTotalsFromLines } from './components/detail-lines.js';
import { folioLabel } from './components/document-list.js';
import { renderLogo, applyShellLabels, setActiveModule } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { setupSearchBar, renderSearchResults } from './components/search-bar.js';
import {
  populateRoleSelect, populateUserDepartmentSelect, populateRoleFilter,
  clearUserForm, startUserEdit, collectUserPayload, showUserErrors,
  renderUsers, filterUsers, renderPermissionMatrix
} from './components/user-management.js';
import { populateDepartmentSelect, clearRequisitionForm, collectRequisitionPayload, showRequisitionErrors, renderRequisitionLines, addRequisitionLine } from './components/requisition-form.js';
import { renderRequisitionList } from './components/requisition-list.js';
import { renderApprovalInbox, renderApprovalDetail, showApprovalError } from './components/approval-inbox.js';
import { renderReceptionInbox, filterReceptionOrders } from './components/reception-list.js';
import { renderReceptionDetail, collectReceptionPayload, showReceptionErrors } from './components/reception-form.js';

function qs(id){ return document.getElementById(id); }

// Ayudantes de género gramatical para etiquetas configurables en español.
// El género se deduce de la primera palabra (p. ej., "Pedido de Venta" → masculino)
// usando terminaciones femeninas comunes (-a, -dad, -ción, ...).
const palabraClave = (word) => String(word).trim().split(/\s+/)[0] || '';
const esFemenina = (word) => /(a|dad|tad|ción|sión|tud|umbre|ie)$/i.test(palabraClave(word));
const articulo = (word) => esFemenina(word) ? 'la' : 'el';
const demostrativo = (word) => esFemenina(word) ? 'esta' : 'este';
const seleccionada = (word) => esFemenina(word) ? 'seleccionada' : 'seleccionado';

const MODULES = ['dashboard', 'entities', 'documents', 'search', 'requisitions', 'approvals', 'receptions', 'users'];
const VIEWS = {
  dashboard: 'view-dashboard',
  entities: 'view-entities',
  documents: 'view-documents',
  search: 'view-search',
  requisitions: 'view-requisitions',
  approvals: 'view-approvals',
  receptions: 'view-receptions',
  users: 'view-users'
};

let wired = false;
let selectedApprovalId = null;
let selectedReceptionOrderId = null;
let selectedEntityId = null;

const MODULE_PERMISSIONS = {
  dashboard: PERMISSIONS.DASHBOARD_VIEW,
  entities: PERMISSIONS.ENTITIES_MANAGE,
  documents: PERMISSIONS.DOCUMENTS_MANAGE,
  search: PERMISSIONS.SEARCH_VIEW,
  requisitions: PERMISSIONS.REQUISITIONS_CREATE,
  approvals: PERMISSIONS.REQUISITIONS_APPROVE,
  receptions: PERMISSIONS.RECEPTIONS_MANAGE,
  users: PERMISSIONS.USERS_MANAGE
};

function showModule(name, opts = {}){
  if(!MODULES.includes(name)) name = 'dashboard';
  if(!can(MODULE_PERMISSIONS[name])) name = 'dashboard';
  MODULES.forEach(m => { qs(VIEWS[m]).hidden = m !== name; });
  setActiveModule(name);
  if(name === 'dashboard'){
    renderDashboard();
  }
  if(name === 'entities'){
    populateDocumentEntitySelect();
    populateEditEntitySelect();
    refreshEntities();
    if(opts.newRecord) clearEntityForm();
    if(opts.focusForm) qs('name').focus();
  }
  if(name === 'documents'){
    populateDocumentEntitySelect();
    populateEditDocumentSelect();
    if(opts.newRecord) clearDocumentForm();
    if(opts.focusForm) qs('document-entity').focus();
  }
  if(name === 'search'){
    refreshSearch();
    if(opts.focusSearch) qs('search-input').focus();
  }
  if(name === 'requisitions'){
    populateDepartmentSelect(qs('requisition-department'));
    if(opts.newRecord) clearRequisitionForm();
    refreshRequisitions();
  }
  if(name === 'approvals'){
    refreshApprovals();
  }
  if(name === 'receptions'){
    refreshReceptions();
  }
  if(name === 'users'){
    populateRoleSelect(qs('user-role'));
    populateRoleFilter(qs('user-role-filter'));
    if(opts.newRecord) clearUserForm();
    refreshUsers();
    renderPermissionMatrix();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populateDocumentEntitySelect(){
  const select = qs('document-entity');
  const prev = select.value;
  select.innerHTML = '';
  loadEntities().forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.entity_id;
    opt.textContent = e.name;
    select.appendChild(opt);
  });
  if(prev && [...select.options].some(o => o.value === prev)) select.value = prev;
}

function populateEditEntitySelect(){
  const select = qs('edit-entity');
  const prev = select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = `-- Selecciona ${articulo(labelFor('entity'))} ${labelFor('entity').toLowerCase()} --`;
  select.appendChild(none);
  loadEntities().forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.name} — ${e.code}`;
    select.appendChild(opt);
  });
  if(prev && [...select.options].some(o => o.value === prev)) select.value = prev;
}

function populateEditDocumentSelect(){
  const select = qs('edit-document');
  const prev = select.value;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = `-- Selecciona ${articulo(labelFor('document'))} ${labelFor('document').toLowerCase()} --`;
  select.appendChild(none);
  const entities = loadEntities();
  loadDocuments().forEach(d => {
    const entity = entities.find(e => e.entity_id === d.entity_id);
    const label = `${entity ? entity.name : 'Entidad desconocida'} · ${folioLabel(d)} · ${d.startDate} → ${d.endDate}`;
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = label;
    select.appendChild(opt);
  });
  if(prev && [...select.options].some(o => o.value === prev)) select.value = prev;
}

function refreshSearch(){
  renderSearchResults(qs('search-results-list'), qs('search-empty'), searchEntities(qs('search-input').value), (e) => createEntityItem(e));
}

function refreshEntities(){
  const entities = loadEntities();
  const visible = filterEntities(entities, qs('entity-table-search').value, qs('entity-status-filter').value);
  renderEntityTable(qs('entity-table-body'), visible, {
    onView: handleViewEntity,
    onEdit: handleEditEntityFromTable
  });
  qs('entity-table-count').textContent = `${visible.length} de ${entities.length}`;
  qs('entity-table').hidden = visible.length === 0;
  qs('entity-table-empty').hidden = visible.length > 0;
  const selected = visible.find(e => e.id === selectedEntityId);
  selectedEntityId = selected ? selected.id : null;
  renderEntityDetail(qs('entity-detail'), selected);
}

function handleViewEntity(entity){
  selectedEntityId = entity.id;
  renderEntityDetail(qs('entity-detail'), entity);
  qs('entity-detail').scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

function handleEditEntityFromTable(entity){
  const select = qs('edit-entity');
  if(select && [...select.options].some(o => o.value === entity.id)) select.value = entity.id;
  startEntityEdit(entity);
  qs('name').focus();
}

function onEditEntityChange(){
  const id = qs('edit-entity').value;
  if(!id){ clearEntityForm(); return; }
  const entity = loadEntities().find(e => e.id === id);
  if(entity) startEntityEdit(entity);
}

function handleDeleteSelectedEntity(){
  const id = qs('edit-entity').value;
  if(!id){ qs('error-edit-entity').textContent = `Selecciona ${articulo(labelFor('entity'))} ${labelFor('entity').toLowerCase()} para eliminar.`; return; }
  if(!confirm(`¿Eliminar ${demostrativo(labelFor('entity'))} ${labelFor('entity').toLowerCase()}? Sus ${labelFor('documents').toLowerCase()} también se eliminarán.`)) return;
  deleteEntity(id);
  qs('error-edit-entity').textContent = '';
  clearEntityForm();
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
  refreshEntities();
}

function onEditDocumentChange(){
  const id = qs('edit-document').value;
  if(!id){ clearDocumentForm(); return; }
  const doc = loadDocuments().find(d => d.id === id);
  if(doc){
    startDocumentEdit(doc);
    applyOrderActionPermissions();
  }
}

function handleDeleteSelectedDocument(){
  const id = qs('edit-document').value;
  if(!id){ qs('error-edit-document').textContent = `Selecciona ${articulo(labelFor('document'))} ${labelFor('document').toLowerCase()} para eliminar.`; return; }
  if(!confirm(`¿Eliminar ${demostrativo(labelFor('document'))} ${labelFor('document').toLowerCase()}?`)) return;
  deleteDocument(id);
  qs('error-edit-document').textContent = '';
  clearDocumentForm();
  populateEditDocumentSelect();
}

function populateSessionSelect(){
  const select = qs('session-user');
  if(!select) return;
  const current = getSession();
  const users = loadUsers().filter(u => u.active !== false);
  select.innerHTML = '';
  const system = document.createElement('option');
  system.value = 'system-admin';
  system.textContent = 'Administrador del sistema';
  select.appendChild(system);
  for(const user of users){
    const opt = document.createElement('option');
    opt.value = user.id;
    opt.textContent = `${user.name} · ${roleLabel(user.role)}`;
    select.appendChild(opt);
  }
  if(current && current.id !== 'system-admin' && !users.some(u => u.id === current.id)){
    const opt = document.createElement('option');
    opt.value = current.id;
    opt.textContent = `${current.name} · ${roleLabel(current.role)}`;
    select.appendChild(opt);
  }
  select.value = current && current.id ? current.id : 'system-admin';
}

function applyPermissions(){
  const navIds = {
    dashboard: 'nav-dashboard',
    entities: 'nav-entities',
    documents: 'nav-documents',
    search: 'nav-search',
    requisitions: 'nav-requisitions',
    approvals: 'nav-approvals',
    receptions: 'nav-receptions',
    users: 'nav-users'
  };
  Object.entries(navIds).forEach(([module, id]) => {
    const el = qs(id);
    if(el) el.hidden = !can(MODULE_PERMISSIONS[module]);
  });
  const actions = {
    'action-new-entity': PERMISSIONS.ENTITIES_MANAGE,
    'action-open-entities': PERMISSIONS.ENTITIES_MANAGE,
    'action-new-document': PERMISSIONS.DOCUMENTS_MANAGE,
    'action-find': PERMISSIONS.SEARCH_VIEW,
    'action-new-requisition': PERMISSIONS.REQUISITIONS_CREATE,
    'action-open-approvals': PERMISSIONS.REQUISITIONS_APPROVE,
    'action-open-receptions': PERMISSIONS.RECEPTIONS_MANAGE,
    'action-open-users': PERMISSIONS.USERS_MANAGE,
    'action-load-mock-data': PERMISSIONS.USERS_MANAGE
  };
  Object.entries(actions).forEach(([id, permission]) => {
    const el = qs(id);
    if(el) el.hidden = !can(permission);
  });
  const requisitionForm = qs('requisition-form');
  if(requisitionForm) requisitionForm.hidden = !can(PERMISSIONS.REQUISITIONS_CREATE);
  const userForm = qs('user-form');
  if(userForm) userForm.hidden = !can(PERMISSIONS.USERS_MANAGE);
  const receptionButton = qs('reception-submit-button');
  if(receptionButton) receptionButton.hidden = !can(PERMISSIONS.RECEPTIONS_MANAGE);
  const approveButton = qs('document-approve');
  if(approveButton && !can(PERMISSIONS.ORDERS_APPROVE)) approveButton.hidden = true;
  renderPermissionMatrix();
}

function onSessionChange(){
  const id = qs('session-user').value;
  if(!id || id === 'system-admin'){
    resetSession();
  } else {
    const user = loadUsers().find(u => u.id === id);
    if(user){
      touchUserAccess(user.id);
      setSession(user);
    } else resetSession();
  }
  clearApprovalSelection();
  applyPermissions();
  showModule('dashboard');
}

export function applySession(user){
  if(user) setSession(user);
  else resetSession();
  clearApprovalSelection();
  populateSessionSelect();
  applyPermissions();
  showModule('dashboard');
}

function refreshUsers(){
  const users = loadUsers();
  const search = qs('user-search') ? qs('user-search').value : '';
  const role = qs('user-role-filter') ? qs('user-role-filter').value : '';
  const visible = filterUsers(users, search, role);
  const empty = qs('users-empty');
  const noResults = qs('users-no-results');
  if(empty) empty.hidden = users.length > 0;
  if(noResults) noResults.hidden = users.length === 0 || visible.length > 0;
  const count = qs('users-count');
  if(count) count.textContent = `Mostrando ${visible.length} de ${users.length} usuarios`;
  renderUsers(qs('users-list'), visible, {
    onEditRole: (user) => { startUserEdit(user); qs('user-role').focus(); },
    onToggleActive: handleToggleUserActive
  });
}

function handleUserSubmit(ev){
  ev.preventDefault();
  const id = qs('user-id').value;
  const payload = collectUserPayload();
  const { valid, errors } = validateUser(payload, id || undefined);
  showUserErrors(errors);
  if(!valid) return;
  try{
    if(id) updateUser(id, payload);
    else addUser(payload);
    clearUserForm();
    refreshUsers();
    populateSessionSelect();
  }catch(e){
    showUserErrors({ role: e.message });
  }
}

function handleToggleUserActive(user){
  if(!can(PERMISSIONS.USERS_MANAGE)){
    const message = qs('users-message');
    message.hidden = false;
    message.textContent = 'Tu rol no permite administrar usuarios.';
    return;
  }
  const activate = user.active === false;
  if(!confirm(`¿${activate ? 'Activar' : 'Desactivar'} a ${user.name}?`)) return;
  try{
    setUserActive(user.id, activate);
    const message = qs('users-message');
    message.hidden = true;
    message.textContent = '';
    refreshUsers();
    populateSessionSelect();
  }catch(e){
    const message = qs('users-message');
    message.hidden = false;
    message.textContent = e.message;
  }
}

function showMockDataMessage(counts){
  const message = qs('mock-data-message');
  if(!message) return;
  message.textContent = `Datos de prueba cargados: ${counts.users} usuarios, ${counts.entities} proveedores, ${counts.documents} órdenes de compra, ${counts.requisitions} solicitudes pendientes, ${counts.issuedOrders} órdenes emitidas y ${counts.receptions} recepciones.`;
  message.hidden = false;
}

function handleLoadMockData(){
  if(!can(PERMISSIONS.USERS_MANAGE)) return;
  const counts = injectMockData();
  selectedApprovalId = null;
  selectedReceptionOrderId = null;
  selectedEntityId = null;
  resetSession();
  populateSessionSelect();
  applyPermissions();
  showModule('dashboard');
  showMockDataMessage(counts);
}

function refreshRequisitions(){
  const list = loadRequisitions().slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  renderRequisitionList(qs('requisitions-list'), qs('requisitions-empty'), list);
}

function handleRequisitionSubmit(ev){
  ev.preventDefault();
  if(!can(PERMISSIONS.REQUISITIONS_CREATE)){
    showRequisitionErrors({ department: 'Tu rol no permite crear solicitudes' });
    return;
  }
  const payload = collectRequisitionPayload();
  const { valid, errors } = validateRequisition(payload);
  showRequisitionErrors(errors);
  if(!valid) return;
  try{
    addRequisition(payload);
    clearRequisitionForm();
    refreshRequisitions();
    renderDashboard();
  }catch(e){
    showRequisitionErrors({ justification: e.message });
  }
}

function clearApprovalSelection(){
  selectedApprovalId = null;
  const detail = qs('approval-detail');
  if(detail) detail.innerHTML = '<p class="muted">Selecciona una solicitud pendiente.</p>';
}

function refreshApprovals(){
  // T039: bandeja limitada al departamento del aprobador (todos si es administrador;
  // ninguno si el aprobador no tiene departamento).
  const pending = pendingRequisitionsForApprover();
  const session = getSession();
  const missingDepartment = can(PERMISSIONS.REQUISITIONS_APPROVE) && !isAdmin() && !(session && session.department);
  const notice = qs('error-approval');
  if(notice) notice.textContent = missingDepartment
    ? 'Tu usuario no tiene un departamento asignado; pide al administrador que lo asigne para revisar solicitudes.'
    : '';
  if(selectedApprovalId && !pending.some(r => r.id === selectedApprovalId)){
    selectedApprovalId = null;
    qs('approval-detail').innerHTML = '<p class="muted">Selecciona una solicitud pendiente.</p>';
  }
  renderApprovalInbox(qs('approvals-list'), qs('approvals-empty'), pending, handleApprovalSelect);
  if(selectedApprovalId){
    const selected = pending.find(r => r.id === selectedApprovalId);
    if(selected) renderApprovalDetail(qs('approval-detail'), selected, budgetForDepartment(selected.department));
  }
}

function handleApprovalSelect(requisition){
  selectedApprovalId = requisition.id;
  showApprovalError('');
  renderApprovalDetail(qs('approval-detail'), requisition, budgetForDepartment(requisition.department));
  const approve = qs('approve-requisition');
  const reject = qs('reject-requisition');
  if(approve) approve.addEventListener('click', handleApproveRequisition);
  if(reject) reject.addEventListener('click', handleRejectRequisition);
}

function handleApproveRequisition(){
  if(!can(PERMISSIONS.REQUISITIONS_APPROVE)){
    showApprovalError('Tu rol no permite aprobar solicitudes.');
    return;
  }
  if(!selectedApprovalId) return;
  try{
    approveRequisition(selectedApprovalId);
    selectedApprovalId = null;
    qs('approval-detail').innerHTML = '<p class="muted">Selecciona una solicitud pendiente.</p>';
    showApprovalError('');
    refreshApprovals();
    renderDashboard();
  }catch(e){
    showApprovalError(e.message);
  }
}

function handleRejectRequisition(){
  if(!can(PERMISSIONS.REQUISITIONS_APPROVE)){
    showApprovalError('Tu rol no permite rechazar solicitudes.');
    return;
  }
  if(!selectedApprovalId) return;
  const reason = qs('rejection-reason') ? qs('rejection-reason').value : '';
  try{
    rejectRequisition(selectedApprovalId, reason);
    selectedApprovalId = null;
    qs('approval-detail').innerHTML = '<p class="muted">Selecciona una solicitud pendiente.</p>';
    showApprovalError('');
    refreshApprovals();
    renderDashboard();
  }catch(e){
    showApprovalError(e.message);
  }
}

function receptionOrders(){
  const entities = loadEntities();
  return ordersPendingReception().map(order => {
    const provider = entities.find(e => e.entity_id === order.entity_id);
    return { ...order, proveedor: provider ? provider.name : '' };
  });
}

function refreshReceptions(){
  const search = qs('reception-search') ? qs('reception-search').value : '';
  const status = qs('reception-status-filter') ? qs('reception-status-filter').value : '';
  const orders = filterReceptionOrders(receptionOrders(), search, status);
  if(selectedReceptionOrderId && !orders.some(o => o.id === selectedReceptionOrderId)){
    selectedReceptionOrderId = null;
    qs('reception-order-id').value = '';
    qs('reception-detail').innerHTML = '<p class="muted">Selecciona una orden por recibir.</p>';
  }
  renderReceptionInbox(qs('receptions-list'), qs('receptions-empty'), orders, handleReceptionSelect, selectedReceptionOrderId);
  if(selectedReceptionOrderId && qs('reception-order-id').value !== selectedReceptionOrderId){
    const selected = orders.find(o => o.id === selectedReceptionOrderId);
    if(selected) renderReceptionDetail(qs('reception-detail'), selected);
  }
}

function handleReceptionSelect(order){
  selectedReceptionOrderId = order.id;
  qs('reception-order-id').value = order.id;
  showReceptionErrors({});
  renderReceptionDetail(qs('reception-detail'), order);
  refreshReceptions();
}

function handleReceptionSubmit(){
  if(!can(PERMISSIONS.RECEPTIONS_MANAGE)){
    showReceptionErrors({ role: 'Tu rol no permite registrar recepciones.' });
    return;
  }
  const payload = collectReceptionPayload();
  payload.orderId = qs('reception-order-id').value;
  const { valid, errors } = validateReception(payload);
  showReceptionErrors(errors);
  if(!valid) return;
  try{
    addReception(payload);
    selectedReceptionOrderId = null;
    qs('reception-order-id').value = '';
    qs('reception-observaciones').value = '';
    qs('reception-detail').innerHTML = '<p class="muted">Selecciona una orden por recibir.</p>';
    showReceptionErrors({});
    refreshReceptions();
    renderDashboard();
  }catch(e){
    showReceptionErrors({ lineas: e.message });
  }
}

function applyOrderActionPermissions(){
  const approve = qs('document-approve');
  const cancel = qs('document-cancel');
  if(approve && !can(PERMISSIONS.ORDERS_APPROVE)) approve.hidden = true;
  if(cancel && !can(PERMISSIONS.DOCUMENTS_MANAGE)) cancel.hidden = true;
}

function handleApproveDocument(){
  const id = qs('document-id').value;
  if(!id) return;
  if(!can(PERMISSIONS.ORDERS_APPROVE)){
    qs('error-status').textContent = 'Tu rol no permite aprobar órdenes.';
    return;
  }
  try{
    const doc = approveDocument(id);
    startDocumentEdit(doc);
    applyOrderActionPermissions();
    populateEditDocumentSelect();
    renderDashboard();
  }catch(e){
    qs('error-status').textContent = e.message;
  }
}

function handleCancelDocument(){
  const id = qs('document-id').value;
  if(!id) return;
  if(!can(PERMISSIONS.DOCUMENTS_MANAGE)){
    qs('error-status').textContent = 'Tu rol no permite cancelar órdenes.';
    return;
  }
  if(!confirm('¿Cancelar la orden seleccionada?')) return;
  try{
    const doc = cancelDocument(id);
    startDocumentEdit(doc);
    applyOrderActionPermissions();
    populateEditDocumentSelect();
    renderDashboard();
  }catch(e){
    qs('error-status').textContent = e.message;
  }
}

function afterSaveRefresh(){
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
  refreshEntities();
}

function handleEntitySubmit(ev){
  ev.preventDefault();
  const id = qs('entity-id').value;
  const payload = collectEntityPayload();
  const { valid, errors } = validateEntity(payload, id || undefined);
  showEntityErrors(errors);
  if(!valid) return;
  if(id){
    try{
      updateEntity(id, payload);
      clearEntityForm();
    }catch(e){ alert(e.message); }
  }else{
    addEntity(payload);
    clearEntityForm();
  }
  afterSaveRefresh();
}

function handleDocumentSubmit(ev){
  ev.preventDefault();
  const id = qs('document-id').value;
  const payload = collectDocumentPayload();
  const existing = id ? loadDocuments().find(d => d.id === id) : undefined;
  const { valid, errors } = validateDocument(payload, existing ? existing.status : undefined);
  showDocumentErrors(errors);
  if(!valid) return;
  try{
    if(id){
      updateDocument(id, payload);
    }else{
      addDocument(payload);
    }
    clearDocumentForm();
  }catch(e){
    alert(e.message);
    showDocumentErrors({ status: e.message });
  }
  afterSaveRefresh();
}

function applyLabels(config){
  const entity = config.labels.entity;
  const entities = config.labels.entities;
  const document_ = config.labels.document;
  const documents = config.labels.documents;
  const femEntity = esFemenina(entity);
  const femDocument = esFemenina(document_);

  document.title = config.moduleName;
  qs('brand-name').textContent = config.moduleName;
  applyShellLabels();

  qs('dashboard-heading').textContent = config.moduleName;
  qs('dashboard-subtitle').textContent = `Gestiona tus ${entities.toLowerCase()} y ${documents.toLowerCase()} en un solo lugar.`;
  qs('action-new-entity-title').textContent = `${femEntity ? 'Nueva' : 'Nuevo'} ${entity}`;
  qs('action-new-entity-sub').textContent = `Crear un registro de ${entity.toLowerCase()}`;
  qs('action-new-document-title').textContent = `${femDocument ? 'Nueva' : 'Nuevo'} ${document_}`;
  qs('action-new-document-sub').textContent = `Registrar un registro de ${document_.toLowerCase()}`;
  qs('action-open-entities-title').textContent = entities;
  qs('action-open-entities-sub').textContent = `Abrir la gestión de ${entities.toLowerCase()}`;
  qs('action-find-title').textContent = 'Buscar registros';
  qs('action-find-sub').textContent = `Buscar ${entities.toLowerCase()}`;

  qs('entities-view-heading').textContent = entities;
  qs('documents-view-heading').textContent = documents;
  qs('entity-form-heading').textContent = `Agregar / Editar ${entity}`;
  qs('edit-entity-heading').textContent = `Editar o eliminar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs('document-form-heading').textContent = `Agregar / Editar ${document_}`;
  qs('edit-document-heading').textContent = `Editar o eliminar ${articulo(document_)} ${document_.toLowerCase()}`;
  qs('search-view-heading').textContent = `Buscar ${entities}`;
  qs('search-heading').textContent = `Buscar ${articulo(entity)} ${entity.toLowerCase()}`;
  qs('search-input').placeholder = 'Buscar por nombre, código, categoría...';
  qs('search-input').setAttribute('aria-label', `Buscar ${entities.toLowerCase()}`);
  qs('search-empty').textContent = 'Sin coincidencias para tu búsqueda.';
  qs('delete-entity').textContent = `Eliminar ${articulo(entity)} ${entity.toLowerCase()} ${seleccionada(entity)}`;
  qs('delete-document').textContent = `Eliminar ${articulo(document_)} ${document_.toLowerCase()} ${seleccionada(document_)}`;
}

function applyTheme(config){
  document.documentElement.style.setProperty('--accent', config.theme.accentColor);
}

function showConfigErrors(errors){
  const banner = qs('config-errors');
  if(errors && errors.length > 0){
    banner.textContent = `Problema de configuración del módulo: ${errors.join(' ')}`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
    banner.textContent = '';
  }
}

function wireEvents(){
  if(wired) return;
  wired = true;
  document.querySelectorAll('.nav-module, .nav-module-extra').forEach(btn => {
    btn.addEventListener('click', () => showModule(btn.dataset.module));
  });
  qs('action-new-entity').addEventListener('click', () => showModule('entities', { newRecord: true, focusForm: true }));
  qs('action-new-document').addEventListener('click', () => showModule('documents', { newRecord: true, focusForm: true }));
  qs('action-open-entities').addEventListener('click', () => showModule('entities'));
  qs('action-find').addEventListener('click', () => showModule('search', { focusSearch: true }));
  qs('action-new-requisition').addEventListener('click', () => showModule('requisitions', { newRecord: true }));
  qs('action-open-approvals').addEventListener('click', () => showModule('approvals'));
  qs('action-open-receptions').addEventListener('click', () => showModule('receptions'));
  qs('action-open-users').addEventListener('click', () => showModule('users', { newRecord: true }));
  qs('action-load-mock-data').addEventListener('click', handleLoadMockData);
  attachRutFormatting(qs('taxId'));
  attachRutFormatting(qs('user-rut'));
  qs('entity-form').addEventListener('submit', handleEntitySubmit);
  qs('cancel-edit').addEventListener('click', clearEntityForm);
  qs('entity-table-search').addEventListener('input', refreshEntities);
  qs('entity-status-filter').addEventListener('change', refreshEntities);
  qs('document-form').addEventListener('submit', handleDocumentSubmit);
  qs('document-cancel-edit').addEventListener('click', clearDocumentForm);
  qs('discount').addEventListener('input', () => syncDocumentTotalsFromLines(qs('document-detail-lines')));
  qs('add-detail-line').addEventListener('click', addDocumentDetailLine);
  qs('document-approve').addEventListener('click', handleApproveDocument);
  qs('document-cancel').addEventListener('click', handleCancelDocument);
  qs('user-form').addEventListener('submit', handleUserSubmit);
  qs('user-cancel-edit').addEventListener('click', clearUserForm);
  qs('user-search').addEventListener('input', refreshUsers);
  qs('user-role-filter').addEventListener('change', refreshUsers);
  qs('user-new-button').addEventListener('click', () => {
    clearUserForm();
    qs('user-username').focus();
  });
  qs('requisition-form').addEventListener('submit', handleRequisitionSubmit);
  qs('add-requisition-line').addEventListener('click', () => addRequisitionLine(qs('requisition-lines'), {}));
  qs('reception-search').addEventListener('input', refreshReceptions);
  qs('reception-status-filter').addEventListener('change', refreshReceptions);
  qs('reception-submit-button').addEventListener('click', handleReceptionSubmit);
  qs('session-user').addEventListener('change', onSessionChange);
  setupSearchBar(qs('search-input'), () => refreshSearch());
  qs('edit-entity').addEventListener('change', onEditEntityChange);
  qs('edit-document').addEventListener('change', onEditDocumentChange);
  qs('delete-entity').addEventListener('click', handleDeleteSelectedEntity);
  qs('delete-document').addEventListener('click', handleDeleteSelectedDocument);
}

export function initApp(resolved){
  showConfigErrors(resolved.errors);
  setActiveConfig(resolved.config);
  applyTheme(resolved.config);
  renderLogo(qs('logo-mark'));
  applyLabels(resolved.config);
  wireEvents();
  clearEntityForm();
  clearDocumentForm();
  populateRoleSelect(qs('user-role'));
  populateUserDepartmentSelect(qs('user-department'));
  populateRoleFilter(qs('user-role-filter'));
  clearUserForm();
  populateDepartmentSelect(qs('requisition-department'));
  clearRequisitionForm();
  populateSessionSelect();
  applyPermissions();
  showModule('dashboard');
}

export async function boot(overrideConfig, options = {}){
  const resolved = overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  const shouldSeed = options.seedMockData ?? (import.meta.env?.MODE !== 'test');
  const seeded = shouldSeed ? ensureMockData() : null;
  initApp(resolved);
  if(seeded) showMockDataMessage(seeded);
}

import { loadModuleConfig, normalizeConfig, setActiveConfig, labelFor } from './module-config.js';
import {
  loadEntities, addEntity, updateEntity, deleteEntity, validateEntity, searchEntities,
  loadDocuments, addDocument, updateDocument, deleteDocument, validateDocument, searchDocuments,
  loadUsers, addUser, updateUser, deactivateUser, validateUser,
  loadRecepciones, addRecepcion, pendingQuantityForLine, receivedQuantityForLine,
  pendingApprovalDocuments, isRequestDocument, PENDING_STATUS
} from './storage.js';
import { can, availableModules, getCurrentUser, listProfiles, login } from './auth.js';
import { clearEntityForm, startEntityEdit, collectEntityPayload, showEntityErrors } from './components/entity-form.js';
import { createEntityItem } from './components/entity-list.js';
import { clearDocumentForm, startDocumentEdit, collectDocumentPayload, showDocumentErrors } from './components/document-form.js';
import { folioLabel, createDocumentItem } from './components/document-list.js';
import { renderLogo, applyShellLabels, setActiveModule } from './components/shell.js';
import { renderDashboard } from './components/dashboard.js';
import { setupSearchBar, renderSearchResults } from './components/search-bar.js';
import { renderApprovalQueue } from './components/approval-inbox.js';
import {
  renderReceptionDocumentSelect, renderReceptionHistory
} from './components/reception-list.js';
import { renderReceptionLines, collectReceptionLines } from './components/reception-form.js';
import {
  renderUserRoleOptions, clearUserForm, startUserEdit, collectUserPayload, showUserErrors
} from './components/user-form.js';
import { renderUserList } from './components/user-list.js';
import {
  renderProfileSwitcher, renderProfileSnapshot, renderRoleCatalog
} from './components/user-profile.js';
import { approveRequest, rejectRequest } from './approval.js';

function qs(id){ return document.getElementById(id); }

// Ayudantes de género gramatical para etiquetas configurables en español.
// El género se deduce de la primera palabra (p. ej., "Pedido de Venta" → masculino)
// usando terminaciones femeninas comunes (-a, -dad, -ción, ...).
const palabraClave = (word) => String(word).trim().split(/\s+/)[0] || '';
const esFemenina = (word) => /(a|dad|tad|ción|sión|tud|umbre|ie)$/i.test(palabraClave(word));
const articulo = (word) => esFemenina(word) ? 'la' : 'el';
const demostrativo = (word) => esFemenina(word) ? 'esta' : 'este';
const seleccionada = (word) => esFemenina(word) ? 'seleccionada' : 'seleccionado';

const MODULES = ['dashboard', 'entities', 'documents', 'search'];
const EXTRA_MODULES = ['approvals', 'reception', 'users', 'profile'];
const ALL_MODULES = [...MODULES, ...EXTRA_MODULES];
const VIEWS = {
  dashboard: 'view-dashboard',
  entities: 'view-entities',
  documents: 'view-documents',
  search: 'view-search',
  approvals: 'view-approvals',
  reception: 'view-reception',
  users: 'view-users',
  profile: 'view-profile'
};

const MODULE_PERMISSIONS = {
  dashboard: 'dashboard:view',
  entities: 'entity:view',
  documents: 'document:view',
  search: 'search:use',
  approvals: 'request:approve',
  reception: 'reception:view',
  users: 'users:manage',
  profile: 'dashboard:view'
};

let wired = false;

function moduleAllowed(name){
  const permission = MODULE_PERMISSIONS[name];
  if(!permission) return false;
  if(can(permission)) return true;
  if(name === 'approvals') return can('document:approve');
  return false;
}

function showModule(name, opts = {}){
  if(!ALL_MODULES.includes(name)) name = 'dashboard';
  if(!moduleAllowed(name)) name = 'dashboard';
  ALL_MODULES.forEach(m => {
    const view = qs(VIEWS[m]);
    if(view) view.hidden = m !== name;
  });
  setActiveModule(name);
  if(name === 'dashboard'){
    renderDashboard();
  }
  if(name === 'entities'){
    populateDocumentEntitySelect();
    populateEditEntitySelect();
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
    refreshDocumentSearch();
    if(opts.focusSearch) qs('search-input').focus();
  }
  if(name === 'approvals'){
    refreshApprovals();
  }
  if(name === 'reception'){
    refreshReception();
  }
  if(name === 'users'){
    refreshUsers();
    if(opts.newRecord) clearUserForm();
  }
  if(name === 'profile'){
    refreshProfile();
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

function entityNameForEntityId(entityId){
  const entity = loadEntities().find(e => e.entity_id === entityId);
  return entity ? entity.name : 'Entidad desconocida';
}

function refreshDocumentSearch(){
  const input = qs('doc-search-input');
  if(!input) return;
  const list = qs('doc-search-results-list');
  const empty = qs('doc-search-empty');
  const results = searchDocuments(input.value);
  list.innerHTML = '';
  if(results.length === 0){
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  results.forEach(doc => list.appendChild(createDocumentItem(doc, entityNameForEntityId(doc.entity_id))));
}

function approvalDocumentsForCurrentUser(){
  const user = getCurrentUser();
  const documents = pendingApprovalDocuments();
  if(user && user.departamento){
    return documents.filter(doc => !doc.departamento || doc.departamento === user.departamento);
  }
  return documents;
}

function refreshApprovals(){
  renderApprovalQueue(
    qs('approval-list'),
    qs('approval-empty'),
    approvalDocumentsForCurrentUser(),
    doc => entityNameForEntityId(doc.entity_id),
    {
      onApprove: doc => decideSelectedApproval(doc, 'aprobado'),
      onReject: doc => decideSelectedApproval(doc, 'cancelado')
    }
  );
}

function decideSelectedApproval(doc, decision){
  const rejecting = decision !== 'aprobado';
  if(!confirm(`¿${rejecting ? 'Rechazar' : 'Aprobar'} ${folioLabel(doc)}?`)) return;
  const promptText = rejecting ? 'Motivo del rechazo (obligatorio)' : 'Comentario de aprobación (opcional)';
  const comment = globalThis.prompt ? globalThis.prompt(promptText, '') : '';
  if(rejecting && !String(comment || '').trim()){
    qs('error-approval').textContent = 'Debes indicar el motivo del rechazo';
    return;
  }
  try{
    if(rejecting) rejectRequest(doc.id, { userId: getActorId(), comment });
    else approveRequest(doc.id, { userId: getActorId(), comment });
    qs('error-approval').textContent = '';
  }catch(e){
    qs('error-approval').textContent = e.message;
    return;
  }
  refreshApprovals();
  renderDashboard();
  populateEditDocumentSelect();
}

function getActorId(){
  const user = getCurrentUser();
  return user ? user.id : null;
}

function receptionCandidates(){
  return loadDocuments().filter(doc => doc.status === 'aprobado' && Array.isArray(doc.lineasDetalle) && doc.lineasDetalle.length > 0);
}

function refreshReception(){
  const select = qs('reception-document');
  const previous = select.value;
  renderReceptionDocumentSelect(select, receptionCandidates(), previous);
  if(!qs('reception-date').value){
    qs('reception-date').value = new Date().toISOString().slice(0, 10);
  }
  renderSelectedReceptionDocument();
  renderReceptionHistory(
    qs('reception-history'),
    qs('reception-history-empty'),
    loadRecepciones(),
    recepcion => {
      const doc = loadDocuments().find(d => d.id === recepcion.documento_id);
      return doc ? folioLabel(doc) : 'Orden desconocida';
    }
  );
}

function selectedReceptionDocument(){
  const id = qs('reception-document').value;
  return loadDocuments().find(d => d.id === id);
}

function renderSelectedReceptionDocument(){
  const doc = selectedReceptionDocument();
  renderReceptionLines(
    qs('reception-lines'),
    doc,
    lineaId => pendingQuantityForLine(doc.id, lineaId),
    lineaId => receivedQuantityForLine(doc.id, lineaId)
  );
}

function handleReceptionSubmit(){
  const doc = selectedReceptionDocument();
  const payload = {
    documentoId: doc ? doc.id : '',
    fechaRecepcion: qs('reception-date').value,
    notas: qs('reception-notes').value,
    lineas: collectReceptionLines(qs('reception-lines'))
  };
  qs('error-reception').textContent = '';
  qs('error-reception-document').textContent = '';
  qs('error-reception-date').textContent = '';
  try{
    addRecepcion(payload);
    qs('reception-notes').value = '';
    refreshReception();
    renderDashboard();
    populateEditDocumentSelect();
  }catch(e){
    qs('error-reception').textContent = e.message;
  }
}

function refreshUsers(){
  renderUserRoleOptions(qs('user-role'));
  renderUserList(qs('user-list'), qs('user-empty'), loadUsers(), {
    onEdit: user => startUserEdit(user),
    onDelete: toggleUserActive
  });
  refreshProfile();
  applyPermissions();
}

function refreshProfile(){
  const user = getCurrentUser();
  const profiles = listProfiles();
  renderProfileSwitcher(qs('active-profile-select'), profiles, user);
  renderProfileSwitcher(qs('profile-view-select'), profiles, user);
  renderProfileSnapshot(qs('profile-current'), user);
  renderRoleCatalog(qs('profile-role-list'), user ? user.role : null);
}

function activeModule(){
  return ALL_MODULES.find(name => {
    const view = qs(VIEWS[name]);
    return view && !view.hidden;
  }) || 'dashboard';
}

function applyProfile(profileId){
  if(!profileId) return;
  login(profileId);
  applyPermissions();
  refreshProfile();
  const current = activeModule();
  showModule(moduleAllowed(current) ? current : 'dashboard');
}

function toggleUserActive(user){
  if(user.active === false){
    updateUser(user.id, { active: true });
  } else {
    if(!confirm(`¿Desactivar a ${user.name}?`)) return;
    try{
      deactivateUser(user.id);
      qs('error-user-list').textContent = '';
    }catch(e){
      qs('error-user-list').textContent = e.message;
      return;
    }
  }
  refreshUsers();
}

function handleUserSubmit(ev){
  ev.preventDefault();
  const id = qs('user-id').value;
  const payload = collectUserPayload();
  const { valid, errors } = validateUser(payload, { excludeId: id || undefined });
  showUserErrors(errors);
  if(!valid) return;
  try{
    if(id) updateUser(id, payload);
    else addUser(payload);
    clearUserForm();
    refreshUsers();
  }catch(e){
    showUserErrors({ username: e.message });
  }
}

function applyPermissions(){
  const access = availableModules();
  const mapping = {
    approvals: access.approvals,
    reception: access.reception,
    users: access.users
  };
  Object.entries(mapping).forEach(([module, allowed]) => {
    const btn = qs(`nav-${module}`);
    if(btn) btn.hidden = !allowed;
  });

  const quickActions = {
    'action-new-entity': can('entity:manage'),
    'action-new-document': can('document:manage') || can('request:create'),
    'action-open-entities': can('entity:view'),
    'action-find': can('search:use')
  };
  Object.entries(quickActions).forEach(([id, allowed]) => {
    const card = qs(id);
    if(card) card.hidden = !allowed;
  });
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
}

function onEditDocumentChange(){
  const id = qs('edit-document').value;
  if(!id){ clearDocumentForm(); return; }
  const doc = loadDocuments().find(d => d.id === id);
  if(doc) startDocumentEdit(doc);
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

function afterSaveRefresh(){
  populateDocumentEntitySelect();
  populateEditEntitySelect();
  populateEditDocumentSelect();
}

function handleEntitySubmit(ev){
  ev.preventDefault();
  const id = qs('entity-id').value;
  const payload = collectEntityPayload();
  const { valid, errors } = validateEntity(payload);
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
  if(!id && isRequestDocument(payload) && !payload.status){
    payload.status = PENDING_STATUS;
  }
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
  document.querySelectorAll('.nav-module, .nav-extra').forEach(btn => {
    btn.addEventListener('click', () => showModule(btn.dataset.module));
  });
  qs('action-new-entity').addEventListener('click', () => showModule('entities', { newRecord: true, focusForm: true }));
  qs('action-new-document').addEventListener('click', () => showModule('documents', { newRecord: true, focusForm: true }));
  qs('action-open-entities').addEventListener('click', () => showModule('entities'));
  qs('action-find').addEventListener('click', () => showModule('search', { focusSearch: true }));
  qs('entity-form').addEventListener('submit', handleEntitySubmit);
  qs('cancel-edit').addEventListener('click', clearEntityForm);
  qs('document-form').addEventListener('submit', handleDocumentSubmit);
  qs('document-cancel-edit').addEventListener('click', clearDocumentForm);
  setupSearchBar(qs('search-input'), () => refreshSearch());
  setupSearchBar(qs('doc-search-input'), () => refreshDocumentSearch());
  qs('edit-entity').addEventListener('change', onEditEntityChange);
  qs('edit-document').addEventListener('change', onEditDocumentChange);
  qs('delete-entity').addEventListener('click', handleDeleteSelectedEntity);
  qs('delete-document').addEventListener('click', handleDeleteSelectedDocument);
  qs('reception-document').addEventListener('change', renderSelectedReceptionDocument);
  qs('reception-submit').addEventListener('click', handleReceptionSubmit);
  qs('user-form').addEventListener('submit', handleUserSubmit);
  qs('user-cancel').addEventListener('click', clearUserForm);
  qs('active-profile-select').addEventListener('change', ev => applyProfile(ev.target.value));
  qs('profile-view-select').addEventListener('change', ev => applyProfile(ev.target.value));
  qs('open-profile').addEventListener('click', () => showModule('profile'));
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
  clearUserForm();
  refreshProfile();
  applyPermissions();
  showModule('dashboard');
}

export async function boot(overrideConfig){
  const resolved = overrideConfig !== undefined ? normalizeConfig(overrideConfig) : await loadModuleConfig();
  initApp(resolved);
}

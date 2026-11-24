import { ROLES, ROLE_KEYS, roleLabel, permissionsFor, can, getSession, PERMISSIONS } from '../auth.js';
import { DEPARTMENTS } from '../storage.js';

function qs(id){ return document.getElementById(id); }

function escapeHtml(s){
  return String(s ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

function normalizeText(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export const PERMISSION_ACTIONS = Object.freeze([
  Object.freeze({
    key: 'createRequisition',
    label: 'Crear solicitudes',
    permissions: Object.freeze([PERMISSIONS.REQUISITIONS_CREATE]),
    mode: 'all'
  }),
  Object.freeze({
    key: 'issueOrder',
    label: 'Emitir OC',
    permissions: Object.freeze([PERMISSIONS.DOCUMENTS_MANAGE, PERMISSIONS.ORDERS_CREATE]),
    mode: 'all'
  }),
  Object.freeze({
    key: 'approveOrder',
    label: 'Aprobar/Rechazar OC',
    permissions: Object.freeze([PERMISSIONS.ORDERS_APPROVE, PERMISSIONS.REQUISITIONS_APPROVE]),
    mode: 'any'
  }),
  Object.freeze({
    key: 'manageSuppliers',
    label: 'Gestionar proveedores',
    permissions: Object.freeze([PERMISSIONS.ENTITIES_MANAGE]),
    mode: 'all'
  }),
  Object.freeze({
    key: 'registerReception',
    label: 'Registrar recepciones',
    permissions: Object.freeze([PERMISSIONS.RECEPTIONS_MANAGE]),
    mode: 'all'
  }),
  Object.freeze({
    key: 'manageUsers',
    label: 'Administrar usuarios',
    permissions: Object.freeze([PERMISSIONS.USERS_MANAGE]),
    mode: 'all'
  })
]);

export function populateRoleSelect(select, selected){
  if(!select) return;
  select.innerHTML = '';
  for(const key of ROLE_KEYS){
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = ROLES[key].label;
    select.appendChild(opt);
  }
  select.value = selected || ROLE_KEYS[0];
}

export function populateUserDepartmentSelect(select, selected){
  if(!select) return;
  select.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = 'Sin departamento';
  select.appendChild(empty);
  for(const department of DEPARTMENTS){
    const opt = document.createElement('option');
    opt.value = department;
    opt.textContent = department;
    select.appendChild(opt);
  }
  select.value = selected || '';
}

export function populateRoleFilter(select, selected = ''){
  if(!select) return;
  select.innerHTML = '';
  const all = document.createElement('option');
  all.value = '';
  all.textContent = 'Todos los roles';
  select.appendChild(all);
  for(const key of ROLE_KEYS){
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = ROLES[key].label;
    select.appendChild(opt);
  }
  select.value = selected;
}

export function clearUserForm(){
  qs('user-id').value = '';
  qs('user-username').value = '';
  qs('user-name').value = '';
  qs('user-email').value = '';
  qs('user-rut').value = '';
  populateUserDepartmentSelect(qs('user-department'), '');
  populateRoleSelect(qs('user-role'), 'solicitante');
  clearUserErrors();
  qs('user-cancel-edit').hidden = true;
  qs('user-submit-button').textContent = 'Guardar Usuario';
}

export function startUserEdit(user){
  qs('user-id').value = user.id;
  qs('user-username').value = user.username || '';
  qs('user-name').value = user.name || '';
  qs('user-email').value = user.email || '';
  qs('user-rut').value = user.rut || '';
  populateUserDepartmentSelect(qs('user-department'), user.department);
  populateRoleSelect(qs('user-role'), user.role);
  clearUserErrors();
  qs('user-cancel-edit').hidden = false;
  qs('user-submit-button').textContent = 'Actualizar Usuario';
}

export function collectUserPayload(){
  return {
    username: qs('user-username').value,
    name: qs('user-name').value,
    email: qs('user-email').value,
    rut: qs('user-rut').value,
    department: qs('user-department').value,
    role: qs('user-role').value
  };
}

const USER_ERROR_FIELDS = ['username', 'name', 'email', 'rut', 'department', 'role'];

export function clearUserErrors(){
  USER_ERROR_FIELDS.forEach(f => {
    const el = qs(`error-user-${f}`);
    if(el) el.textContent = '';
  });
}

export function showUserErrors(errors = {}){
  USER_ERROR_FIELDS.forEach(f => {
    const el = qs(`error-user-${f}`);
    if(el) el.textContent = errors[f] || '';
  });
}

export function filterUsers(users, search = '', role = ''){
  const term = normalizeText(search).trim();
  return (users || []).filter(user => {
    if(role && user.role !== role) return false;
    if(!term) return true;
    return normalizeText(user.name).includes(term)
      || normalizeText(user.email).includes(term)
      || normalizeText(user.username).includes(term);
  });
}

function formatLastAccess(value){
  if(!value) return '—';
  const text = String(value);
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return `${text.slice(0, 10)} ${text.slice(11, 16)}`;
  return text;
}

function cell(value){
  const td = document.createElement('td');
  td.textContent = value === undefined || value === null || value === '' ? '—' : String(value);
  return td;
}

function actionButton(text, className, handler, user){
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  if(handler) button.addEventListener('click', () => handler(user));
  return button;
}

export function renderUsers(container, users, handlers = {}){
  if(!container) return;
  container.innerHTML = '';
  for(const user of users || []){
    const row = document.createElement('tr');
    row.dataset.userId = user.id;

    const nameCell = cell(user.name);
    nameCell.textContent = '';
    nameCell.innerHTML = `<div class="user-name-cell"><strong>${escapeHtml(user.name)}</strong><span class="user-username">@${escapeHtml(user.username)}</span></div>`;
    row.appendChild(nameCell);
    row.appendChild(cell(user.email));
    row.appendChild(cell(user.rut));
    row.appendChild(cell(user.department));

    const roleCell = cell('');
    roleCell.innerHTML = `<span class="status-badge role-badge" data-role="${escapeHtml(user.role)}">${escapeHtml(roleLabel(user.role))}</span>`;
    row.appendChild(roleCell);

    const active = user.active !== false;
    const statusCell = cell('');
    statusCell.innerHTML = `<span class="status-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'Activo' : 'Inactivo'}</span>`;
    row.appendChild(statusCell);
    row.appendChild(cell(formatLastAccess(user.lastAccess)));

    const actions = document.createElement('td');
    actions.className = 'table-actions';
    actions.appendChild(actionButton('Editar rol', 'secondary', handlers.onEditRole || handlers.onEdit, user));
    actions.appendChild(actionButton(active ? 'Desactivar' : 'Activar', active ? 'danger' : 'secondary', handlers.onToggleActive || handlers.onDeactivate, user));
    row.appendChild(actions);
    container.appendChild(row);
  }
}

function allowsWithMode(allowed, action){
  return action.mode === 'any' ? allowed.some(Boolean) : allowed.every(Boolean);
}

function roleAllows(role, action){
  const granted = permissionsFor(role);
  return allowsWithMode(action.permissions.map(permission => granted.includes(permission)), action);
}

function sessionAllows(action){
  return allowsWithMode(action.permissions.map(permission => can(permission)), action);
}

function permissionCell(allowed, action, subject){
  const td = document.createElement('td');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = allowed;
  checkbox.disabled = true;
  checkbox.setAttribute('aria-label', `${subject} · ${action.label}`);
  td.appendChild(checkbox);
  return td;
}

export function renderPermissionMatrix(){
  const body = qs('permission-matrix-body');
  if(!body) return;
  body.innerHTML = '';

  const session = getSession();
  const sessionLabel = session
    ? `${session.name || session.username} · ${roleLabel(session.role)}`
    : 'Sin sesión';
  const badge = qs('permission-session-badge');
  if(badge){
    badge.textContent = session ? `Sesión: ${sessionLabel}` : 'Sin sesión';
    badge.dataset.tone = session && session.active !== false ? 'sky' : 'red';
  }

  for(const role of ROLE_KEYS){
    const isCurrent = Boolean(session && session.active !== false && session.role === role);
    const row = document.createElement('tr');
    if(isCurrent) row.classList.add('is-current-role');
    row.dataset.role = role;

    const labelCell = document.createElement('td');
    labelCell.innerHTML = `<span class="status-badge role-badge" data-role="${escapeHtml(role)}">${escapeHtml(roleLabel(role))}</span>` +
      (isCurrent ? '<span class="current-role-tag">Tu rol</span>' : '');
    row.appendChild(labelCell);
    for(const action of PERMISSION_ACTIONS){
      row.appendChild(permissionCell(roleAllows(role, action), action, roleLabel(role)));
    }
    body.appendChild(row);
  }

  const sessionRow = document.createElement('tr');
  sessionRow.id = 'permission-session-row';
  sessionRow.className = 'session-permission-row';
  const sessionCell = document.createElement('td');
  sessionCell.innerHTML = `<strong>Sesión activa</strong><span class="user-username">${escapeHtml(sessionLabel)}</span>`;
  sessionRow.appendChild(sessionCell);
  for(const action of PERMISSION_ACTIONS){
    sessionRow.appendChild(permissionCell(sessionAllows(action), action, sessionLabel));
  }
  body.appendChild(sessionRow);

  const note = qs('permission-matrix-note');
  if(note){
    note.textContent = session && session.active === false
      ? 'La sesión está inactiva: ninguna acción está disponible.'
      : `Permisos vigentes para ${sessionLabel}. La fila "Sesión activa" se actualiza al cambiar de usuario.`;
  }
}

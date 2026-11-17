import { ROLES, ROLE_KEYS, roleLabel } from '../auth.js';

function qs(id){ return document.getElementById(id); }

function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

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

export function clearUserForm(){
  qs('user-id').value = '';
  qs('user-username').value = '';
  qs('user-name').value = '';
  populateRoleSelect(qs('user-role'), 'solicitante');
  clearUserErrors();
  qs('user-cancel-edit').hidden = true;
  qs('user-submit-button').textContent = 'Guardar Usuario';
}

export function startUserEdit(user){
  qs('user-id').value = user.id;
  qs('user-username').value = user.username || '';
  qs('user-name').value = user.name || '';
  populateRoleSelect(qs('user-role'), user.role);
  clearUserErrors();
  qs('user-cancel-edit').hidden = false;
  qs('user-submit-button').textContent = 'Actualizar Usuario';
}

export function collectUserPayload(){
  return {
    username: qs('user-username').value,
    name: qs('user-name').value,
    role: qs('user-role').value
  };
}

export function clearUserErrors(){
  ['username', 'name', 'role'].forEach(f => {
    const el = qs(`error-user-${f}`);
    if(el) el.textContent = '';
  });
}

export function showUserErrors(errors = {}){
  ['username', 'name', 'role'].forEach(f => {
    const el = qs(`error-user-${f}`);
    if(el) el.textContent = errors[f] || '';
  });
}

export function renderUsers(container, users, handlers = {}){
  if(!container) return;
  container.innerHTML = '';
  if(!users || users.length === 0) return;
  for(const user of users){
    const li = document.createElement('li');
    li.className = 'entity-item';
    li.innerHTML = `<strong>${escapeHtml(user.name)}</strong> <span class="muted">(${escapeHtml(user.username)})</span> ` +
      `<span class="status-badge">${escapeHtml(roleLabel(user.role))}</span> ` +
      `<span class="status-badge ${user.active === false ? 'badge-inactive' : ''}">${user.active === false ? 'Inactivo' : 'Activo'}</span>`;
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => handlers.onEdit && handlers.onEdit(user));
    const deactivate = document.createElement('button');
    deactivate.type = 'button';
    deactivate.className = 'danger';
    deactivate.textContent = 'Desactivar';
    deactivate.disabled = user.active === false;
    deactivate.addEventListener('click', () => handlers.onDeactivate && handlers.onDeactivate(user));
    actions.appendChild(edit);
    actions.appendChild(deactivate);
    li.appendChild(actions);
    container.appendChild(li);
  }
}

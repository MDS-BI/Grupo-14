import { ROLE_KEYS, roleLabel } from '../auth.js';

function qs(id){ return document.getElementById(id); }

export function renderUserRoleOptions(select){
  if(!select) return;
  const current = select.value;
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  ROLE_KEYS.forEach(role => {
    const opt = document.createElement('option');
    opt.value = role;
    opt.textContent = roleLabel(role);
    select.appendChild(opt);
  });
  if(current && [...select.options].some(o => o.value === current)) select.value = current;
}

export function clearUserErrors(){
  ['username', 'name', 'role'].forEach(field => {
    const el = qs(`error-user-${field}`);
    if(el) el.textContent = '';
  });
}

export function clearUserForm(){
  qs('user-id').value = '';
  qs('user-username').value = '';
  qs('user-name').value = '';
  renderUserRoleOptions(qs('user-role'));
  qs('user-role').value = '';
  qs('user-departamento').value = '';
  qs('user-active').checked = true;
  qs('user-cancel').hidden = true;
  qs('user-submit').textContent = 'Guardar usuario';
  clearUserErrors();
}

export function startUserEdit(user){
  qs('user-id').value = user.id;
  qs('user-username').value = user.username || '';
  qs('user-name').value = user.name || '';
  renderUserRoleOptions(qs('user-role'));
  qs('user-role').value = user.role || '';
  qs('user-departamento').value = user.departamento || '';
  qs('user-active').checked = user.active !== false;
  qs('user-cancel').hidden = false;
  qs('user-submit').textContent = 'Actualizar usuario';
  clearUserErrors();
}

export function collectUserPayload(){
  return {
    username: qs('user-username').value,
    name: qs('user-name').value,
    role: qs('user-role').value,
    departamento: qs('user-departamento').value,
    active: qs('user-active').checked
  };
}

export function showUserErrors(errors = {}){
  ['username', 'name', 'role'].forEach(field => {
    const el = qs(`error-user-${field}`);
    if(el) el.textContent = errors[field] || '';
  });
}

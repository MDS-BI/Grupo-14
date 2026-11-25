import { ROLE_KEYS, roleLabel, permissionsFor } from '../auth.js';
import { escapeHtml } from '../dom.js';

export function renderProfileSwitcher(select, profiles, currentUser){
  if(!select) return;
  const currentId = currentUser ? currentUser.id : (profiles && profiles[0] ? profiles[0].id : '');
  select.innerHTML = '';
  (profiles || []).forEach(profile => {
    const opt = document.createElement('option');
    opt.value = profile.id;
    const suffix = profile.system ? ' (sistema)' : '';
    const inactive = profile.active === false ? ' (inactivo)' : '';
    opt.textContent = `${profile.name} — ${roleLabel(profile.role)}${suffix}${inactive}`;
    opt.disabled = profile.active === false;
    select.appendChild(opt);
  });
  if([...select.options].some(o => o.value === currentId)) select.value = currentId;
}

export function renderProfileSnapshot(container, user){
  if(!container) return;
  if(!user){
    container.innerHTML = '<p class="empty">No hay un perfil activo.</p>';
    return;
  }
  const rows = [
    ['Nombre', user.name],
    ['Usuario', user.username],
    ['Rol', roleLabel(user.role)],
    ['Permisos', permissionsFor(user.role).length],
    ['Estado', user.active === false ? 'Inactivo' : 'Activo'],
    ['Tipo', user.system ? 'Perfil del sistema' : 'Usuario registrado']
  ];
  container.innerHTML = `<dl class="profile-facts">${
    rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')
  }</dl>`;
}

export function renderRoleCatalog(listEl, activeRole){
  if(!listEl) return;
  listEl.innerHTML = '';
  ROLE_KEYS.forEach(roleKey => {
    const item = document.createElement('li');
    item.className = 'profile-role-item' + (roleKey === activeRole ? ' active' : '');
    item.dataset.role = roleKey;
    const capabilities = permissionsFor(roleKey)
      .map(capability => `<li>${escapeHtml(capability)}</li>`)
      .join('');
    item.innerHTML = `<div class="profile-role-head"><strong>${escapeHtml(roleLabel(roleKey))}</strong>${
      roleKey === activeRole ? ' <span class="status-badge">perfil activo</span>' : ''
    }</div>${
      capabilities ? `<ul class="profile-role-capabilities">${capabilities}</ul>` : ''
    }`;
    listEl.appendChild(item);
  });
}

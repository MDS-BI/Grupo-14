import { roleLabel } from '../auth.js';
import { escapeHtml } from '../dom.js';

export function renderUserList(listEl, emptyEl, users, { onEdit, onDelete } = {}){
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!users || users.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  users.forEach(user => {
    const li = document.createElement('li');
    li.className = 'user-item';
    li.dataset.id = user.id;
    const info = document.createElement('div');
    info.innerHTML = `<strong>${escapeHtml(user.name)}</strong>`
      + ` <span class="muted">(${escapeHtml(user.username)})</span>`
      + ` &middot; ${escapeHtml(roleLabel(user.role))}`
      + (user.departamento ? ` &middot; ${escapeHtml(user.departamento)}` : '')
      + (user.active === false ? ' <span class="status-badge">inactivo</span>' : '');
    li.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary user-edit';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => onEdit && onEdit(user));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger user-delete';
    del.textContent = user.active === false ? 'Reactivar' : 'Desactivar';
    del.addEventListener('click', () => onDelete && onDelete(user));
    actions.appendChild(edit);
    actions.appendChild(del);
    li.appendChild(actions);
    listEl.appendChild(li);
  });
}

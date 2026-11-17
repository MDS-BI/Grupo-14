import { escapeHtml } from '../dom.js';
import { folioLabel } from './document-list.js';

export function createApprovalItem(doc, entityName, { onApprove, onReject } = {}){
  const li = document.createElement('li');
  li.className = 'approval-item';
  li.dataset.id = doc.id;

  const info = document.createElement('div');
  info.className = 'approval-info';
  info.innerHTML = `<strong>${escapeHtml(folioLabel(doc))}</strong>`
    + ` &middot; ${escapeHtml(doc.tipoDocumento || 'Solicitud')}`
    + (entityName ? ` &middot; ${escapeHtml(entityName)}` : '')
    + (doc.departamento ? `<div class="muted">Departamento: ${escapeHtml(doc.departamento)}</div>` : '')
    + (doc.justificacion ? `<div class="muted">Justificación: ${escapeHtml(doc.justificacion)}</div>` : '');
  li.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const approve = document.createElement('button');
  approve.type = 'button';
  approve.className = 'primary approval-approve';
  approve.textContent = 'Aprobar';
  approve.addEventListener('click', () => onApprove && onApprove(doc));

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'danger approval-reject';
  reject.textContent = 'Rechazar';
  reject.addEventListener('click', () => onReject && onReject(doc));

  actions.appendChild(approve);
  actions.appendChild(reject);
  li.appendChild(actions);
  return li;
}

export function renderApprovalQueue(listEl, emptyEl, documents, entityNameFor, handlers){
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!documents || documents.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  documents.forEach(doc => {
    listEl.appendChild(createApprovalItem(doc, entityNameFor ? entityNameFor(doc) : undefined, handlers));
  });
}

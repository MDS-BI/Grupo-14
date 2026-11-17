import { loadDocuments } from '../storage.js';
import { labelFor, getConfig } from '../module-config.js';
import { createDocumentItem } from './document-list.js';

function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function normalizeText(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function filterEntities(entities, search = '', status = ''){
  const term = normalizeText(search).trim();
  const termDigits = term.replace(/[^0-9k]/g, '');
  return (entities || []).filter(entity => {
    if(status && (entity.estado || 'Activo') !== status) return false;
    if(!term) return true;
    const name = normalizeText(entity.name);
    const taxId = normalizeText(entity.taxId);
    const taxIdDigits = taxId.replace(/[^0-9k]/g, '');
    return name.includes(term) || (termDigits.length > 0 && taxIdDigits.includes(termDigits));
  });
}

function cell(value){
  const td = document.createElement('td');
  td.textContent = value === undefined || value === null || value === '' ? '—' : String(value);
  return td;
}

function actionButton(action, entity, label, handler){
  const button = document.createElement('button');
  button.type = 'button';
  button.className = action === 'view' ? 'secondary' : 'primary';
  button.dataset.action = action;
  button.dataset.entityId = entity.id;
  button.textContent = label;
  if(handler) button.addEventListener('click', () => handler(entity));
  return button;
}

export function renderEntityTable(tbody, entities, handlers = {}){
  tbody.innerHTML = '';
  for(const entity of entities){
    const row = document.createElement('tr');
    row.dataset.entityId = entity.id;
    [
      entity.name,
      entity.taxId,
      entity.categoriaProveedor || entity.category,
      entity.vendedorContacto,
      entity.email,
      entity.paymentTerms
    ].forEach(value => row.appendChild(cell(value)));

    const status = entity.estado || 'Activo';
    const statusCell = cell(status);
    statusCell.innerHTML = '';
    const badge = document.createElement('span');
    badge.className = `status-badge ${status === 'Inactivo' ? 'is-inactive' : 'is-active'}`;
    badge.textContent = status;
    statusCell.appendChild(badge);
    row.appendChild(statusCell);

    const actions = document.createElement('td');
    actions.className = 'table-actions';
    actions.appendChild(actionButton('view', entity, 'Ver', handlers.onView));
    actions.appendChild(actionButton('edit', entity, 'Editar', handlers.onEdit));
    row.appendChild(actions);
    tbody.appendChild(row);
  }
}

export function renderEntityDetail(container, entity){
  container.innerHTML = '';
  if(!entity){
    container.hidden = true;
    return;
  }
  const fields = [
    ['Nombre', entity.name],
    ['RUT', entity.taxId],
    ['Rubro', entity.categoriaProveedor || entity.category],
    ['Contacto', entity.vendedorContacto],
    ['Email', entity.email],
    ['Teléfono', entity.phone],
    ['Dirección', entity.address],
    ['Condiciones de pago', entity.paymentTerms],
    ['Estado', entity.estado || 'Activo'],
    ['Descripción', entity.description]
  ];
  const table = document.createElement('table');
  table.className = 'detail-table';
  const tbody = document.createElement('tbody');
  for(const [label, value] of fields){
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = label;
    row.appendChild(nameCell);
    row.appendChild(cell(value));
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);
  container.hidden = false;
}

export function createEntityItem(entity){
  const li = document.createElement('li');
  li.className = 'entity-item';
  const custom = getConfig().customFields.filter(f => f.target === 'entity');
  const customBits = custom
    .filter(f => entity[f.key] !== undefined && entity[f.key] !== null)
    .map(f => ` &middot; ${escapeHtml(f.label)}: ${escapeHtml(String(entity[f.key]))}`)
    .join('');
  const meta = document.createElement('div');
  meta.className = 'entity-meta';
  meta.innerHTML = `<strong>${escapeHtml(entity.name)}</strong><div>${escapeHtml(entity.code)}${entity.category ? ' • ' + escapeHtml(entity.category) : ''}</div>` +
    `${entity.targetDate ? '<div class="muted">Fecha objetivo: ' + escapeHtml(entity.targetDate) + '</div>' : ''}` +
    `${entity.description ? '<div class="muted">' + escapeHtml(entity.description) + '</div>' : ''}` +
    (customBits ? `<div class="muted">${customBits}</div>` : '');;
  const docs = document.createElement('div');
  docs.className = 'entity-documents';
  renderDocumentsFor(entity, docs);
  li.appendChild(meta);
  li.appendChild(docs);
  return li;
}

export function renderDocumentsFor(entity, container){
  const documents = loadDocuments().filter(d => d.entity_id === entity.entity_id);
  const heading = document.createElement('div');
  heading.className = 'muted';
  heading.textContent = labelFor('documents') + ':';
  container.appendChild(heading);
  if(documents.length === 0){
    const none = document.createElement('div');
    none.className = 'muted';
    none.textContent = `Aún no hay ${labelFor('documents').toLowerCase()}.`;
    container.appendChild(none);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'document-list';
    for(const d of documents) ul.appendChild(createDocumentItem(d));
    container.appendChild(ul);
  }
}

export function renderEntityList(listEl, entities){
  listEl.innerHTML = '';
  if(!entities || entities.length === 0) return false;
  for(const e of entities) listEl.appendChild(createEntityItem(e));
  return true;
}

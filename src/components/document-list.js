function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

export function folioLabel(doc){
  const folio = ['OC', 'SC'].includes(doc.series)
    ? String(doc.folio ?? '').padStart(4, '0')
    : doc.folio;
  return `${doc.series ? `${doc.series}-` : ''}${folio}`;
}

export function createDocumentItem(doc, entityName){
  const li = document.createElement('li');
  li.className = 'document-item';
  const amount = (doc.totalAmount !== undefined) ? ` &middot; ${escapeHtml(String(doc.currency || ''))}${escapeHtml(String(doc.totalAmount))}` : '';
  const status = doc.status ? ` <span class="status-badge">${escapeHtml(doc.estadoVisible || doc.status)}</span>` : '';
  const info = document.createElement('span');
  const lineasDetalle = Array.isArray(doc.lineasDetalle) ? doc.lineasDetalle : [];
  const lineas = lineasDetalle.length > 0
    ? ` &middot; ${lineasDetalle.length} línea(s) &middot; ${escapeHtml(lineasDetalle.map(l => `${l.descripcion}: ${l.subtotalLinea ?? 0}`).join('; '))}`
    : '';
  const tipo = doc.tipoDocumento ? ` &middot; ${escapeHtml(doc.tipoDocumento)}` : '';
  const justificacion = doc.justificacion
    ? `<div class="muted">Justificación: ${escapeHtml(doc.justificacion)}</div>`
    : '';
  info.innerHTML = `<strong>${escapeHtml(folioLabel(doc))}</strong> &middot; ${escapeHtml(doc.startDate)} &rarr; ${escapeHtml(doc.endDate)}`
    + `${tipo}${lineas}`
    + `${doc.quantity ? ' &middot; ' + escapeHtml(String(doc.quantity)) + ' cant.' : ''}${amount}${status}`
    + `${entityName ? `<div class="muted">${escapeHtml(entityName)}</div>` : ''}`
    + justificacion;
  li.appendChild(info);
  return li;
}

export function renderDocumentList(listEl, documents, entityNameFor){
  listEl.innerHTML = '';
  if(!documents || documents.length === 0) return false;
  for(const d of documents){
    listEl.appendChild(createDocumentItem(d, entityNameFor ? entityNameFor(d) : undefined));
  }
  return true;
}

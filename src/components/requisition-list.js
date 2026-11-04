function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

export function renderRequisitionList(container, emptyEl, requisitions){
  if(!container) return;
  container.innerHTML = '';
  if(!requisitions || requisitions.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  for(const r of requisitions){
    const li = document.createElement('li');
    li.className = 'entity-item';
    const lineas = Array.isArray(r.lineasDetalle) ? r.lineasDetalle : [];
    li.innerHTML = `<strong>${escapeHtml(r.folio || r.id)}</strong> ` +
      `<span class="status-badge">${escapeHtml(r.status)}</span> ` +
      `<div class="muted">${escapeHtml(r.department)} · ${escapeHtml(r.requesterName || 'Solicitante')} · ${escapeHtml((r.createdAt || '').slice(0, 10))}</div>` +
      `<div>${escapeHtml(r.justification)}</div>` +
      `<div class="muted">${lineas.length} línea(s) · partida: ${escapeHtml(r.budgetLine || 'General')}</div>`;
    container.appendChild(li);
  }
}

export function renderRequisitionDetail(container, requisition, budget){
  if(!container || !requisition) return;
  const lineas = Array.isArray(requisition.lineasDetalle) ? requisition.lineasDetalle : [];
  const rows = lineas.map(l =>
    `<tr><td>${escapeHtml(l.descripcion)}</td><td>${escapeHtml(String(l.cantidad))}</td><td>${escapeHtml(l.unidadMedida || '')}</td></tr>`
  ).join('');
  const budgetText = budget
    ? `<p class="muted">Presupuesto del área: ${escapeHtml(String(budget.total))} · Usado: ${escapeHtml(String(budget.used))} · Disponible: ${escapeHtml(String(budget.available))}</p>`
    : '';
  container.innerHTML = `<h3>${escapeHtml(requisition.folio || requisition.id)}</h3>` +
    `<p class="muted">${escapeHtml(requisition.department)} · ${escapeHtml(requisition.requesterName || '')}</p>` +
    `<div class="justification-box"><strong>Justificación:</strong><p>${escapeHtml(requisition.justification)}</p></div>` +
    budgetText +
    `<table class="detail-table"><thead><tr><th>Producto/servicio</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>${rows}</tbody></table>`;
}

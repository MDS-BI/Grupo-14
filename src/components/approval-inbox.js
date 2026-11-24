function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

export function renderApprovalInbox(container, emptyEl, requisitions, onSelect){
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.textContent = `${r.folio || r.id} · ${r.requesterName || 'Solicitante'} · ${(r.createdAt || '').slice(0, 10)}`;
    btn.addEventListener('click', () => onSelect && onSelect(r));
    li.appendChild(btn);
    const reason = document.createElement('div');
    reason.className = 'muted';
    reason.textContent = r.justification;
    li.appendChild(reason);
    container.appendChild(li);
  }
}

export function renderApprovalDetail(container, requisition, budget){
  if(!container) return;
  if(!requisition){
    container.innerHTML = '<p class="muted">Selecciona una solicitud pendiente.</p>';
    return;
  }
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
    `<table class="detail-table"><thead><tr><th>Producto/servicio</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>${rows}</tbody></table>` +
    `<div class="form-actions"><button type="button" class="primary" id="approve-requisition">Autorizar</button>` +
    `<button type="button" class="danger" id="reject-requisition">Rechazar</button></div>` +
    `<div><label for="rejection-reason">Motivo del rechazo *</label><textarea id="rejection-reason" rows="2"></textarea>` +
    `<div class="error" id="error-rejection-reason" aria-live="polite"></div></div>`;
}

export function showApprovalError(message){
  const el = document.getElementById('error-rejection-reason');
  if(el) el.textContent = message || '';
}

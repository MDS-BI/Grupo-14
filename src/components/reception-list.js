import { escapeHtml } from '../dom.js';
import { folioLabel } from './document-list.js';

export function renderReceptionDocumentSelect(select, documents, selected){
  if(!select) return;
  select.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '-- Selecciona una orden aprobada --';
  select.appendChild(none);
  documents.forEach(doc => {
    const opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = `${folioLabel(doc)} · ${doc.startDate} → ${doc.endDate}`;
    select.appendChild(opt);
  });
  if(selected && [...select.options].some(o => o.value === selected)) select.value = selected;
}

export function renderReceptionHistory(listEl, emptyEl, recepciones, documentLabelFor){
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!recepciones || recepciones.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  recepciones.forEach(recepcion => {
    const li = document.createElement('li');
    li.className = 'reception-history-item';
    const total = recepcion.lineas.reduce((sum, l) => sum + Number(l.cantidadRecibida || 0), 0);
    li.innerHTML = `<strong>${escapeHtml(recepcion.fechaRecepcion)}</strong>`
      + ` &middot; ${escapeHtml(documentLabelFor ? documentLabelFor(recepcion) : recepcion.documento_id)}`
      + ` &middot; ${escapeHtml(String(total))} unidades`
      + (recepcion.notas ? `<div class="muted">${escapeHtml(recepcion.notas)}</div>` : '');
    listEl.appendChild(li);
  });
}

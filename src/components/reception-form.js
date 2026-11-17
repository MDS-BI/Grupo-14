import { escapeHtml } from '../dom.js';

export function renderReceptionLines(container, doc, pendingForLine, receivedForLine){
  if(!container) return;
  container.innerHTML = '';
  if(!doc || !Array.isArray(doc.lineasDetalle) || doc.lineasDetalle.length === 0){
    const note = document.createElement('p');
    note.className = 'empty';
    note.textContent = 'Esta orden no tiene líneas de detalle registradas.';
    container.appendChild(note);
    return;
  }
  const title = document.createElement('h3');
  title.textContent = 'Líneas por recibir';
  container.appendChild(title);

  doc.lineasDetalle.forEach(linea => {
    const pendiente = pendingForLine ? pendingForLine(linea.id) : Number(linea.cantidad);
    const recibida = receivedForLine ? receivedForLine(linea.id) : Math.max(Number(linea.cantidad) - pendiente, 0);
    const row = document.createElement('div');
    row.className = 'reception-line';
    row.dataset.id = linea.id;
    row.innerHTML = `<strong>${escapeHtml(linea.producto_id)}</strong>`
      + ` &middot; ${escapeHtml(linea.descripcion)}`
      + ` <span class="muted">(solicitado: ${escapeHtml(String(linea.cantidad))} ${escapeHtml(linea.unidadMedida)}`
      + ` &middot; recibido: ${escapeHtml(String(recibida))} &middot; pendiente: ${escapeHtml(String(pendiente))})</span>`;

    const label = document.createElement('label');
    label.textContent = `Cantidad recibida (pendiente: ${pendiente})`;
    label.setAttribute('for', `reception-cantidad-${linea.id}`);
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'reception-cantidad';
    input.min = '0';
    input.step = 'any';
    input.max = String(pendiente);
    input.value = pendiente > 0 ? String(pendiente) : '0';
    input.disabled = pendiente <= 0;
    input.id = `reception-cantidad-${linea.id}`;

    const motivoLabel = document.createElement('label');
    motivoLabel.textContent = 'Motivo de rechazo (opcional)';
    const motivo = document.createElement('input');
    motivo.type = 'text';
    motivo.className = 'reception-motivo';
    motivo.placeholder = 'Solo si rechazas unidades';

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(motivoLabel);
    row.appendChild(motivo);
    container.appendChild(row);
  });
}

export function collectReceptionLines(container){
  if(!container) return [];
  return [...container.querySelectorAll('.reception-line')]
    .map(row => ({
      linea_id: row.dataset.id,
      cantidadRecibida: row.querySelector('.reception-cantidad').value,
      motivoRechazo: row.querySelector('.reception-motivo').value
    }))
    .filter(linea => Number(linea.cantidadRecibida) > 0);
}

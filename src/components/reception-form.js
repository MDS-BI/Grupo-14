import { receivedQuantityForLine, pendingQuantityForLine } from '../storage.js';

function qs(id){ return document.getElementById(id); }

function escapeHtml(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

function numberCell(value, field, index){
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = 'any';
  input.value = value === undefined || value === null ? '' : String(value);
  input.dataset.field = field;
  input.dataset.index = String(index);
  input.setAttribute('aria-label', field === 'cantidadRecibida' ? `Cantidad recibida línea ${index + 1}` : `Cantidad rechazada línea ${index + 1}`);
  return input;
}

export function renderReceptionDetail(container, order){
  if(!container) return;
  if(!order){
    container.innerHTML = '<p class="muted">Selecciona una orden por recibir.</p>';
    return;
  }
  container.innerHTML = '';
  const heading = document.createElement('h3');
  const folio = `${order.series ? `${order.series}-` : ''}${order.folio}`;
  heading.textContent = `${folio} · ${order.status}`;
  container.appendChild(heading);

  const lineas = Array.isArray(order.lineasDetalle) ? order.lineasDetalle : [];
  if(lineas.length === 0){
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'La orden no tiene líneas de detalle.';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  table.className = 'detail-table';
  table.innerHTML = '<thead><tr><th>Producto</th><th>Solicitada</th><th>Recibida</th><th>Pendiente</th><th>Recibir</th><th>Rechazar</th><th>Motivo</th></tr></thead>';
  const tbody = document.createElement('tbody');
  lineas.forEach((line, i) => {
    const tr = document.createElement('tr');
    const requested = Number(line.cantidad) || 0;
    const received = receivedQuantityForLine(order.id, i);
    const pending = pendingQuantityForLine(order, i);
    tr.innerHTML = `<td>${escapeHtml(line.descripcion)}</td>` +
      `<td>${escapeHtml(String(requested))}</td>` +
      `<td>${escapeHtml(String(received))}</td>` +
      `<td>${escapeHtml(String(pending))}</td>`;
    const recibidaCell = document.createElement('td');
    recibidaCell.appendChild(numberCell('', 'cantidadRecibida', i));
    const rechazadaCell = document.createElement('td');
    rechazadaCell.appendChild(numberCell('', 'cantidadRechazada', i));
    const motivoCell = document.createElement('td');
    const motivo = document.createElement('input');
    motivo.type = 'text';
    motivo.dataset.field = 'motivoRechazo';
    motivo.dataset.index = String(i);
    motivo.placeholder = 'Motivo si rechaza';
    motivo.setAttribute('aria-label', `Motivo del rechazo línea ${i + 1}`);
    motivoCell.appendChild(motivo);
    tr.appendChild(recibidaCell);
    tr.appendChild(rechazadaCell);
    tr.appendChild(motivoCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const errors = document.createElement('div');
  errors.className = 'error';
  errors.id = 'error-reception-lines';
  errors.setAttribute('aria-live', 'polite');
  container.appendChild(errors);
}

export function collectReceptionPayload(){
  const container = qs('reception-detail');
  const lineas = [...(container?.querySelectorAll('[data-field="cantidadRecibida"]') || [])].map(input => {
    const idx = Number(input.dataset.index);
    const rechazada = container.querySelector(`[data-field="cantidadRechazada"][data-index="${idx}"]`);
    const motivo = container.querySelector(`[data-field="motivoRechazo"][data-index="${idx}"]`);
    return {
      ordenLineaIndex: idx,
      cantidadRecibida: input.value,
      cantidadRechazada: rechazada ? rechazada.value : '',
      motivoRechazo: motivo ? motivo.value : ''
    };
  });
  return {
    orderId: qs('reception-order-id') ? qs('reception-order-id').value : '',
    observaciones: qs('reception-observaciones') ? qs('reception-observaciones').value : '',
    lineas
  };
}

export function showReceptionErrors(errors = {}){
  const orderErr = qs('error-reception-order');
  if(orderErr) orderErr.textContent = errors.orderId || errors.role || '';
  const general = qs('error-reception-lines');
  if(general) general.textContent = errors.lineas || '';
  Object.entries(errors).forEach(([key, msg]) => {
    if(!key.startsWith('linea-')) return;
    if(general && !general.textContent) general.textContent = msg;
  });
}

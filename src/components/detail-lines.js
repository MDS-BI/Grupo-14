import { getConfig, computeSubtotalLinea, subtotalFromLineas, applyTotalesToCabecera, DEFAULT_TAX_RATE } from '../module-config.js';

function qs(id){ return document.getElementById(id); }

function num(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function field(label, input, errorId){
  const wrap = document.createElement('div');
  const lab = document.createElement('label');
  lab.textContent = label;
  wrap.appendChild(lab);
  wrap.appendChild(input);
  if(errorId){
    const err = document.createElement('div');
    err.className = 'error';
    err.id = errorId;
    wrap.appendChild(err);
  }
  return wrap;
}

function textInput(value, placeholder){
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value === undefined || value === null ? '' : String(value);
  if(placeholder) input.placeholder = placeholder;
  return input;
}

function numberInput(value, opts = {}){
  const input = document.createElement('input');
  input.type = 'number';
  input.step = opts.step || 'any';
  if(opts.min !== undefined) input.min = String(opts.min);
  if(opts.max !== undefined) input.max = String(opts.max);
  input.value = value === undefined || value === null ? '' : String(value);
  return input;
}

function unitControl(value){
  const units = getConfig().lineasDetalle.unidadesMedida || [];
  if(units.length === 0) return textInput(value, 'unidades');
  const select = document.createElement('select');
  for(const u of units){
    const opt = document.createElement('option');
    opt.value = u;
    opt.textContent = u;
    select.appendChild(opt);
  }
  select.value = value || units[0];
  return select;
}

function createRow(line = {}, index){
  const row = document.createElement('div');
  row.className = 'detail-line';
  row.dataset.index = String(index);

  const producto = textInput(line.producto_id, 'ID/SKU');
  producto.dataset.field = 'producto_id';
  const descripcion = textInput(line.descripcion, 'Descripción del ítem');
  descripcion.dataset.field = 'descripcion';
  const cantidad = numberInput(line.cantidad, { min: 0 });
  cantidad.dataset.field = 'cantidad';
  const unidad = unitControl(line.unidadMedida);
  unidad.dataset.field = 'unidadMedida';
  const precio = numberInput(line.precioUnitario, { min: 0 });
  precio.dataset.field = 'precioUnitario';
  const pct = numberInput(line.porcentajeDescuentoLinea === undefined ? 0 : line.porcentajeDescuentoLinea, { min: 0, max: getConfig().lineasDetalle.maxPorcentajeDescuento });
  pct.dataset.field = 'porcentajeDescuentoLinea';
  const subtotal = document.createElement('input');
  subtotal.type = 'text';
  subtotal.readOnly = true;
  subtotal.dataset.field = 'subtotalLinea';
  subtotal.value = String(line.subtotalLinea !== undefined ? line.subtotalLinea : computeSubtotalLinea(line));

  row.appendChild(field('Producto *', producto, `error-linea-${index}-producto_id`));
  row.appendChild(field('Descripción *', descripcion, `error-linea-${index}-descripcion`));
  row.appendChild(field('Cantidad *', cantidad, `error-linea-${index}-cantidad`));
  row.appendChild(field('Unidad *', unidad, `error-linea-${index}-unidadMedida`));
  row.appendChild(field('Precio unitario *', precio, `error-linea-${index}-precioUnitario`));
  row.appendChild(field('% Descuento', pct, `error-linea-${index}-porcentajeDescuentoLinea`));
  row.appendChild(field('Subtotal de línea', subtotal));

  const removeWrap = document.createElement('div');
  removeWrap.className = 'detail-line-remove';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'danger';
  remove.textContent = 'Quitar';
  remove.addEventListener('click', () => {
    row.remove();
    renumberRows(row.parentElement);
    syncDocumentTotalsFromLines(row.parentElement);
  });
  removeWrap.appendChild(remove);
  row.appendChild(removeWrap);

  [cantidad, precio, pct].forEach(input => input.addEventListener('input', () => {
    subtotal.value = String(computeSubtotalLinea(readRow(row)));
    syncDocumentTotalsFromLines(row.parentElement);
  }));

  return row;
}

function renumberRows(container){
  if(!container) return;
  [...container.querySelectorAll('.detail-line')].forEach((row, i) => {
    row.dataset.index = String(i);
    row.querySelectorAll('.error[id]').forEach(err => {
      err.id = err.id.replace(/linea-\d+-/, `linea-${i}-`);
    });
  });
}

function readRow(row){
  const get = (f) => {
    const el = row.querySelector(`[data-field="${f}"]`);
    return el ? el.value : '';
  };
  return {
    producto_id: get('producto_id'),
    descripcion: get('descripcion'),
    cantidad: get('cantidad'),
    unidadMedida: get('unidadMedida'),
    precioUnitario: get('precioUnitario'),
    porcentajeDescuentoLinea: get('porcentajeDescuentoLinea')
  };
}

export function addDetailLine(container, line){
  if(!container) return;
  const index = container.querySelectorAll('.detail-line').length;
  container.appendChild(createRow(line || {}, index));
  syncDocumentTotalsFromLines(container);
}

export function renderDetailLines(container, lineas = []){
  if(!container) return;
  container.innerHTML = '';
  for(const line of lineas) addDetailLine(container, line);
  syncDocumentTotalsFromLines(container);
}

export function collectDetailLines(container){
  if(!container) return [];
  return [...container.querySelectorAll('.detail-line')].map(readRow).filter(l => {
    return String(l.producto_id).trim() || String(l.descripcion).trim() || String(l.cantidad).trim() || String(l.precioUnitario).trim();
  });
}

export function showDetailLineErrors(container, errors = {}){
  if(!container) return;
  container.querySelectorAll('.error[id]').forEach(el => { el.textContent = ''; });
  Object.entries(errors).forEach(([key, msg]) => {
    const el = container.querySelector(`#error-${key}`);
    if(el) el.textContent = msg;
  });
  const general = qs('error-detail-lines');
  if(general) general.textContent = errors.lineas || '';
}

export function clearDetailLineErrors(container){
  showDetailLineErrors(container, {});
}

export function syncDocumentTotalsFromLines(container){
  if(!container) return;
  const lineas = [...container.querySelectorAll('.detail-line')].map(readRow);
  if(lineas.length === 0) return;
  const prepared = lineas.map(l => ({ ...l, subtotalLinea: computeSubtotalLinea(l) }));
  const discount = num(qs('discount') ? qs('discount').value : 0);
  const cab = applyTotalesToCabecera({ lineasDetalle: prepared, discount }, DEFAULT_TAX_RATE);
  if(qs('subtotal')) qs('subtotal').value = String(cab.subtotal);
  if(qs('taxAmount')) qs('taxAmount').value = String(cab.taxAmount);
  if(qs('totalAmount')) qs('totalAmount').value = String(cab.totalAmount);
  lineas.forEach((l, i) => {
    const row = container.querySelectorAll('.detail-line')[i];
    const out = row && row.querySelector('[data-field="subtotalLinea"]');
    if(out) out.value = String(computeSubtotalLinea(l));
  });
}

export { subtotalFromLineas };

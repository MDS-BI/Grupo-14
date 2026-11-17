import { computeSubtotalLinea, getConfig } from '../module-config.js';

function qs(id){ return document.getElementById(id); }

function field(labelText, input){
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.appendChild(label);
  wrap.appendChild(input);
  return wrap;
}

function textInput(className, value, attrs = {}){
  const input = document.createElement('input');
  input.className = className;
  input.type = attrs.type || 'text';
  if(attrs.min !== undefined) input.min = attrs.min;
  if(attrs.step !== undefined) input.step = attrs.step;
  if(attrs.placeholder) input.placeholder = attrs.placeholder;
  input.value = value === undefined || value === null ? '' : String(value);
  return input;
}

function unidadOptions(value){
  const select = document.createElement('select');
  select.className = 'linea-unidad';
  const unidades = (getConfig().lineasDetalle && getConfig().lineasDetalle.unidadesMedida) || [];
  if(unidades.length === 0){
    const input = textInput('linea-unidad', value, { placeholder: 'unidad' });
    return input;
  }
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  for(const unidad of unidades){
    const opt = document.createElement('option');
    opt.value = unidad;
    opt.textContent = unidad;
    select.appendChild(opt);
  }
  select.value = value || '';
  return select;
}

function rowSubtotal(row){
  const subtotal = computeSubtotalLinea({
    cantidad: row.querySelector('.linea-cantidad').value,
    precioUnitario: row.querySelector('.linea-precio').value,
    porcentajeDescuentoLinea: row.querySelector('.linea-descuento').value
  });
  const out = row.querySelector('.linea-subtotal');
  if(out) out.textContent = subtotal.toFixed(2);
  return subtotal;
}

function refreshTotal(container){
  const total = [...container.querySelectorAll('.linea-row')]
    .reduce((sum, row) => sum + rowSubtotal(row), 0);
  const out = qs('document-lineas-total');
  if(out) out.textContent = total.toFixed(2);
}

function addLineaRow(container, linea = {}){
  const row = document.createElement('div');
  row.className = 'linea-row';
  row.dataset.id = linea.id || '';

  row.appendChild(field('Producto', textInput('linea-producto', linea.producto_id, { placeholder: 'Código o clave' })));
  row.appendChild(field('Descripción', textInput('linea-descripcion', linea.descripcion)));
  row.appendChild(field('Cantidad', textInput('linea-cantidad', linea.cantidad, { type: 'number', min: '0', step: 'any' })));
  row.appendChild(field('Unidad', unidadOptions(linea.unidadMedida)));
  row.appendChild(field('Precio unitario', textInput('linea-precio', linea.precioUnitario, { type: 'number', min: '0', step: 'any' })));
  row.appendChild(field('Descuento %', textInput('linea-descuento', linea.porcentajeDescuentoLinea, { type: 'number', min: '0', step: 'any' })));
  row.appendChild(field('Subtotal', (() => {
    const out = document.createElement('span');
    out.className = 'linea-subtotal';
    out.textContent = '0.00';
    return out;
  })()));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'secondary linea-remove';
  remove.textContent = 'Quitar';
  remove.addEventListener('click', () => {
    row.remove();
    refreshTotal(container);
  });
  row.appendChild(remove);

  container.querySelector('.lineas-rows').appendChild(row);
  row.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => refreshTotal(container));
    input.addEventListener('change', () => refreshTotal(container));
  });
  rowSubtotal(row);
  return row;
}

export function renderLineasDetalle(container, lineas = []){
  if(!container) return;
  container.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = (getConfig().lineasDetalle && getConfig().lineasDetalle.label) || 'Líneas de detalle';
  container.appendChild(title);

  const rows = document.createElement('div');
  rows.className = 'lineas-rows';
  container.appendChild(rows);

  const list = Array.isArray(lineas) ? lineas : [];
  if(list.length === 0) addLineaRow(container, {});
  else list.forEach(linea => addLineaRow(container, linea));

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const add = document.createElement('button');
  add.type = 'button';
  add.id = 'lineas-add';
  add.className = 'secondary';
  add.textContent = 'Agregar línea';
  add.addEventListener('click', () => addLineaRow(container, {}));
  actions.appendChild(add);
  const totalWrap = document.createElement('p');
  totalWrap.className = 'muted';
  totalWrap.innerHTML = 'Total de líneas: <strong id="document-lineas-total">0.00</strong>';
  actions.appendChild(totalWrap);
  container.appendChild(actions);

  const error = document.createElement('div');
  error.className = 'error';
  error.id = 'error-lineasDetalle';
  error.setAttribute('aria-live', 'polite');
  container.appendChild(error);

  refreshTotal(container);
}

export function collectLineasDetalle(container){
  if(!container) return [];
  return [...container.querySelectorAll('.linea-row')].map(row => {
    const linea = {
      producto_id: row.querySelector('.linea-producto').value,
      descripcion: row.querySelector('.linea-descripcion').value,
      cantidad: row.querySelector('.linea-cantidad').value,
      unidadMedida: row.querySelector('.linea-unidad').value,
      precioUnitario: row.querySelector('.linea-precio').value,
      porcentajeDescuentoLinea: row.querySelector('.linea-descuento').value
    };
    if(row.dataset.id) linea.id = row.dataset.id;
    return linea;
  }).filter(linea => linea.producto_id || linea.descripcion || linea.cantidad || linea.precioUnitario);
}

export function clearLineasErrors(container){
  if(!container) return;
  const error = container.querySelector('#error-lineasDetalle');
  if(error) error.textContent = '';
}

import { DEPARTMENTS, DEPARTMENT_BUDGETS } from '../storage.js';

function qs(id){ return document.getElementById(id); }

function textInput(value, placeholder){
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value === undefined || value === null ? '' : String(value);
  if(placeholder) input.placeholder = placeholder;
  return input;
}

function numberInput(value, min = 0){
  const input = document.createElement('input');
  input.type = 'number';
  input.min = String(min);
  input.step = 'any';
  input.value = value === undefined || value === null ? '' : String(value);
  return input;
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

export function populateDepartmentSelect(select, selected){
  if(!select) return;
  select.innerHTML = '';
  for(const dep of DEPARTMENTS){
    const opt = document.createElement('option');
    opt.value = dep;
    opt.textContent = dep;
    select.appendChild(opt);
  }
  select.value = selected || DEPARTMENTS[0];
}

function createLine(line = {}, index){
  const row = document.createElement('div');
  row.className = 'detail-line';
  row.dataset.index = String(index);

  const descripcion = textInput(line.descripcion, 'Producto o servicio');
  descripcion.dataset.field = 'descripcion';
  const cantidad = numberInput(line.cantidad, 0);
  cantidad.dataset.field = 'cantidad';
  const unidad = textInput(line.unidadMedida || 'unidades', 'unidades');
  unidad.dataset.field = 'unidadMedida';
  const precio = numberInput(line.precioEstimado, 0);
  precio.dataset.field = 'precioEstimado';

  row.appendChild(field('Producto o servicio *', descripcion, `error-linea-${index}-descripcion`));
  row.appendChild(field('Cantidad *', cantidad, `error-linea-${index}-cantidad`));
  row.appendChild(field('Unidad', unidad));
  row.appendChild(field('Precio estimado', precio, `error-linea-${index}-precioEstimado`));

  const removeWrap = document.createElement('div');
  removeWrap.className = 'detail-line-remove';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'danger';
  remove.textContent = 'Quitar';
  remove.addEventListener('click', () => row.remove());
  removeWrap.appendChild(remove);
  row.appendChild(removeWrap);
  return row;
}

export function addRequisitionLine(container, line){
  if(!container) return;
  const index = container.querySelectorAll('.detail-line').length;
  container.appendChild(createLine(line || {}, index));
}

export function renderRequisitionLines(container, lineas = []){
  if(!container) return;
  container.innerHTML = '';
  for(const line of lineas) addRequisitionLine(container, line);
}

export function clearRequisitionForm(){
  qs('requisition-id').value = '';
  qs('requisition-budget-line').value = '';
  qs('requisition-justification').value = '';
  populateDepartmentSelect(qs('requisition-department'), DEPARTMENTS[0]);
  const lines = qs('requisition-lines');
  renderRequisitionLines(lines, []);
  addRequisitionLine(lines, {});
  clearRequisitionErrors();
  qs('requisition-submit-button').textContent = 'Enviar Solicitud';
}

export function collectRequisitionPayload(){
  const lineas = [...(qs('requisition-lines')?.querySelectorAll('.detail-line') || [])].map(row => {
    const get = (f) => row.querySelector(`[data-field="${f}"]`)?.value ?? '';
    return {
      descripcion: get('descripcion'),
      cantidad: get('cantidad'),
      unidadMedida: get('unidadMedida'),
      precioEstimado: get('precioEstimado')
    };
  }).filter(l => String(l.descripcion).trim() || String(l.cantidad).trim());
  return {
    department: qs('requisition-department').value,
    budgetLine: qs('requisition-budget-line').value,
    justification: qs('requisition-justification').value,
    lineasDetalle: lineas
  };
}

export function clearRequisitionErrors(){
  ['department', 'justification', 'lines'].forEach(f => {
    const el = qs(`error-requisition-${f}`);
    if(el) el.textContent = '';
  });
  qs('requisition-lines')?.querySelectorAll('.error[id]').forEach(el => { el.textContent = ''; });
}

export function showRequisitionErrors(errors = {}){
  const dep = qs('error-requisition-department');
  if(dep) dep.textContent = errors.department || '';
  const just = qs('error-requisition-justification');
  if(just) just.textContent = errors.justification || '';
  const lines = qs('error-requisition-lines');
  if(lines) lines.textContent = errors.lineasDetalle || '';
  Object.entries(errors).forEach(([key, msg]) => {
    if(!key.startsWith('linea-')) return;
    const el = qs(`error-${key}`);
    if(el) el.textContent = msg;
  });
}

export function budgetHint(department){
  const total = DEPARTMENT_BUDGETS[department];
  return total === undefined ? '' : `Presupuesto asignado: ${total}`;
}

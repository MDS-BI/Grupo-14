import { renderCustomFields, collectCustomFields, showCustomFieldErrors, clearCustomFieldErrors } from './custom-fields.js';
import { renderDetailLines, collectDetailLines, addDetailLine, showDetailLineErrors, clearDetailLineErrors } from './detail-lines.js';
import { getConfig } from '../module-config.js';
import { DOCUMENT_STATUS, NON_CANCELLABLE_ORDER_STATUSES, RECEPTION_DERIVED_STATUSES, PENDING_STATUS } from '../storage.js';

function qs(id){ return document.getElementById(id); }

const REQUEST_DOCUMENT_TYPE = 'Solicitud de Cotización';

// Los estados de recepción solo los asigna el registro de recepciones, así que
// no se ofrecen como opción manual (salvo para mostrar el estado actual).
function allowedStatusesFor(currentStatus){
  const lc = getConfig().statusLifecycle;
  if(!lc) return null;
  const manual = s => !RECEPTION_DERIVED_STATUSES.includes(s);
  if(currentStatus === undefined || currentStatus === null || currentStatus === ''){
    return lc.statuses.filter(manual);
  }
  const next = lc.transitions[currentStatus] || [];
  return [currentStatus, ...next.filter(s => s !== currentStatus && manual(s))];
}

export function renderStatusControl(currentStatus){
  const container = qs('document-status-control');
  container.innerHTML = '';
  const allowed = allowedStatusesFor(currentStatus);
  const wrap = document.createElement('div');
  const label = document.createElement('label');
  label.setAttribute('for', 'status');
  label.textContent = 'Estado';
  wrap.appendChild(label);
  let control;
  if(allowed){
    control = document.createElement('select');
    control.id = 'status';
    control.name = 'status';
    if(currentStatus === undefined || currentStatus === null || currentStatus === ''){
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '--';
      control.appendChild(blank);
    }
    for(const s of allowed){
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      control.appendChild(opt);
    }
  } else {
    control = document.createElement('input');
    control.id = 'status';
    control.name = 'status';
    control.type = 'text';
    control.placeholder = 'p. ej., pendiente';
  }
  wrap.appendChild(control);
  const err = document.createElement('div');
  err.className = 'error';
  err.id = 'error-status';
  err.setAttribute('aria-live', 'polite');
  wrap.appendChild(err);
  container.appendChild(wrap);
}

export function clearDocumentForm(){
  qs('document-id').value = '';
  qs('series').value = '';
  qs('folio').value = '';
  qs('startDate').value = '';
  qs('endDate').value = '';
  qs('quantity').value = '';
  qs('subtotal').value = '';
  qs('discount').value = '';
  qs('taxAmount').value = '';
  qs('totalAmount').value = '';
  qs('currency').value = '';
  qs('docPaymentTerms').value = '';
  if(qs('justificacion')) qs('justificacion').value = '';
  qs('notes').value = '';
  if(qs('payment-invoice')) qs('payment-invoice').value = '';
  if(qs('payment-amount')) qs('payment-amount').value = '';
  if(qs('payment-date')) qs('payment-date').value = '';
  clearDocumentErrors();
  renderCustomFields(qs('document-custom-fields'), 'document');
  renderStatusControl('');
  renderDetailLines(qs('document-detail-lines'), []);
  qs('document-cancel-edit').hidden = true;
  qs('document-submit-button').textContent = 'Guardar Documento';
  toggleOrderActions(null);
}

export function toggleOrderActions(doc){
  const approve = qs('document-approve');
  const cancel = qs('document-cancel');
  const pay = qs('document-pay');
  const status = doc ? doc.status : '';
  const canApprove = Boolean(doc) && status === DOCUMENT_STATUS.APPROVED;
  const canCancel = Boolean(doc) && !NON_CANCELLABLE_ORDER_STATUSES.includes(status);
  const canPay = Boolean(doc) && status === DOCUMENT_STATUS.RECEIVED;
  if(approve) approve.hidden = !canApprove;
  if(cancel) cancel.hidden = !canCancel;
  if(pay) pay.hidden = !canPay;
}

const DOCUMENT_ERROR_FIELDS = ['entityId', 'folio', 'startDate', 'endDate', 'quantity', 'subtotal', 'discount', 'taxAmount', 'totalAmount', 'status', 'justificacion'];

export function clearDocumentErrors(){
  DOCUMENT_ERROR_FIELDS.forEach(f => {
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if(el) el.textContent = '';
  });
  clearCustomFieldErrors(qs('document-custom-fields'));
  clearDetailLineErrors(qs('document-detail-lines'));
  const paymentError = qs('error-payment');
  if(paymentError) paymentError.textContent = '';
}

export function startDocumentEdit(doc){
  renderCustomFields(qs('document-custom-fields'), 'document', doc);
  renderDetailLines(qs('document-detail-lines'), doc.lineasDetalle || []);
  qs('document-id').value = doc.id;
  qs('document-entity-id').value = doc.entity_id;
  qs('document-entity').value = doc.entity_id;
  qs('series').value = doc.series || '';
  qs('folio').value = doc.folio === undefined ? '' : doc.folio;
  qs('startDate').value = doc.startDate || '';
  qs('endDate').value = doc.endDate || '';
  qs('quantity').value = doc.quantity === undefined ? '' : doc.quantity;
  qs('subtotal').value = doc.subtotal === undefined ? '' : doc.subtotal;
  qs('discount').value = doc.discount === undefined ? '' : doc.discount;
  qs('taxAmount').value = doc.taxAmount === undefined ? '' : doc.taxAmount;
  qs('totalAmount').value = doc.totalAmount === undefined ? '' : doc.totalAmount;
  qs('currency').value = doc.currency || '';
  qs('docPaymentTerms').value = doc.paymentTerms || '';
  if(qs('justificacion')) qs('justificacion').value = doc.justificacion || '';
  qs('notes').value = doc.notes || '';
  if(qs('payment-invoice')) qs('payment-invoice').value = doc.factura || '';
  if(qs('payment-amount')) qs('payment-amount').value = doc.montoPagado ?? '';
  if(qs('payment-date')) qs('payment-date').value = doc.fechaPago || '';
  renderStatusControl(doc.status);
  setStatusValue(doc.status);
  clearDocumentErrors();
  qs('document-cancel-edit').hidden = false;
  qs('document-submit-button').textContent = 'Actualizar Documento';
  toggleOrderActions(doc);
}

function setStatusValue(value){
  const control = qs('status');
  if(control) control.value = value || '';
}

export function collectDocumentPayload(){
  const custom = collectCustomFields(qs('document-custom-fields'), 'document');
  const status = qs('status') ? qs('status').value : '';
  return {
    entityId: qs('document-entity-id').value || qs('document-entity').value,
    series: qs('series').value,
    folio: qs('folio').value,
    startDate: qs('startDate').value,
    endDate: qs('endDate').value,
    quantity: qs('quantity').value,
    subtotal: qs('subtotal').value,
    discount: qs('discount').value,
    taxAmount: qs('taxAmount').value,
    totalAmount: qs('totalAmount').value,
    currency: qs('currency').value,
    paymentTerms: qs('docPaymentTerms').value,
    justificacion: qs('justificacion') ? qs('justificacion').value : '',
    notes: qs('notes').value,
    status: status || (custom.tipoDocumento === REQUEST_DOCUMENT_TYPE ? PENDING_STATUS : ''),
    lineasDetalle: collectDetailLines(qs('document-detail-lines')),
    ...custom
  };
}

export function addDocumentDetailLine(){
  addDetailLine(qs('document-detail-lines'), {});
}

export function showDocumentErrors(errors){
  for(const f of DOCUMENT_ERROR_FIELDS){
    const elId = f === 'entityId' ? 'error-document-entity' : `error-${f}`;
    const el = qs(elId);
    if(el) el.textContent = errors[f] || '';
  }
  showCustomFieldErrors(qs('document-custom-fields'), 'document', errors);
  showDetailLineErrors(qs('document-detail-lines'), errors);
}

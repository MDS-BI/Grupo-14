import {
  PENDING_STATUS, decideApproval, isRequestDocument, loadDocuments, loadEntities, patchDocument
} from './storage.js';

export function validateApproval(doc){
  const errors = {};
  if(!doc){
    errors.documento = 'La solicitud no existe';
    return { valid: false, errors };
  }
  if(!isRequestDocument(doc)) errors.documento = 'El documento no es una solicitud de compra';
  if(doc.status !== PENDING_STATUS) errors.status = 'La solicitud no está pendiente de aprobación';

  const entity = loadEntities().find(e => e.entity_id === doc.entity_id);
  if(!entity){
    errors.entity = 'El proveedor de la solicitud no existe';
    return { valid: Object.keys(errors).length === 0, errors };
  }
  if(!entity.taxId) errors.taxId = 'El proveedor no tiene identificación fiscal registrada';
  if(!entity.categoriaProveedor) errors.categoriaProveedor = 'El proveedor no tiene categoría registrada';
  if(!entity.paymentTerms) errors.paymentTerms = 'El proveedor no tiene condiciones de pago registradas';
  if(entity.creditLimit === undefined || entity.creditLimit === null || entity.creditLimit === ''){
    errors.creditLimit = 'El proveedor no tiene límite de crédito registrado';
  } else {
    const total = Number(doc.totalAmount || 0);
    if(Number.isFinite(Number(entity.creditLimit)) && total > Number(entity.creditLimit)){
      errors.creditLimit = 'El monto de la orden supera el límite de crédito del proveedor';
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function nextOrderFolio(){
  const next = loadDocuments()
    .filter(doc => doc.series === 'OC')
    .reduce((max, doc) => Math.max(max, Number(doc.folio) || 0), 0) + 1;
  return next;
}

export function approveRequest(id, { userId, comment } = {}){
  const doc = loadDocuments().find(d => d.id === id);
  const check = validateApproval(doc);
  if(!check.valid) throw new Error(Object.values(check.errors)[0]);

  decideApproval(id, 'aprobado', { userId, comment });
  const folio = nextOrderFolio();
  return patchDocument(id, { series: 'OC', folio });
}

export function rejectRequest(id, { userId, comment } = {}){
  if(!String(comment || '').trim()){
    throw new Error('Debes indicar el motivo del rechazo');
  }
  const doc = loadDocuments().find(d => d.id === id);
  if(!doc) throw new Error('La solicitud no existe');
  if(doc.status !== PENDING_STATUS) throw new Error('La solicitud no está pendiente de aprobación');
  return decideApproval(id, 'cancelado', { userId, comment });
}

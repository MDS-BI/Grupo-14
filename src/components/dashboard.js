import { getConfig } from '../module-config.js';
import { currentUser } from '../auth.js';
import { loadEntities, loadDocuments, loadRequisitions, loadReceptions, listRequisitionsForUser, REQUISITION_STATUS, ISSUED_ORDER_STATUSES } from '../storage.js';

export function recordCounts(){
  const documents = loadDocuments();
  return {
    entities: loadEntities().length,
    documents: documents.length,
    requisitions: loadRequisitions().filter(r => r.status === REQUISITION_STATUS.PENDING).length,
    orders: documents.filter(d => ISSUED_ORDER_STATUSES.includes(d.status)).length,
    receptions: loadReceptions().length
  };
}

export function renderDashboard(){
  const counts = recordCounts();
  const labels = getConfig().labels;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.textContent = String(value);
  };
  set('stat-entities', counts.entities);
  set('stat-documents', counts.documents);
  set('stat-requisitions', counts.requisitions);
  set('stat-orders', counts.orders);
  set('stat-receptions', counts.receptions);

  const entitiesLabel = document.getElementById('stat-entities-label');
  if(entitiesLabel) entitiesLabel.textContent = labels.entities;
  const documentsLabel = document.getElementById('stat-documents-label');
  if(documentsLabel) documentsLabel.textContent = labels.documents;
  const requisitionsLabel = document.getElementById('stat-requisitions-label');
  if(currentUser()?.role === 'solicitante'){
    set('stat-requisitions', listRequisitionsForUser().length);
    if(requisitionsLabel) requisitionsLabel.textContent = 'Mis solicitudes';
  } else if(requisitionsLabel){
    requisitionsLabel.textContent = 'Solicitudes pendientes';
  }
}

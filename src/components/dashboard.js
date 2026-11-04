import { getConfig } from '../module-config.js';
import { loadEntities, loadDocuments, loadRequisitions, loadReceptions, REQUISITION_STATUS } from '../storage.js';

const EMITTED_STATUSES = ['aprobado', 'recibido parcialmente', 'recibido', 'facturado'];

export function recordCounts(){
  const documents = loadDocuments();
  return {
    entities: loadEntities().length,
    documents: documents.length,
    requisitions: loadRequisitions().filter(r => r.status === REQUISITION_STATUS.PENDING).length,
    orders: documents.filter(d => EMITTED_STATUSES.includes(d.status)).length,
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
}

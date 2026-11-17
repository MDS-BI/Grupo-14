import { getConfig } from '../module-config.js';
import { loadEntities, loadDocuments, pendingApprovalDocuments } from '../storage.js';

export function recordCounts(){
  const documents = loadDocuments();
  return {
    entities: loadEntities().length,
    documents: documents.length,
    pendingApprovals: pendingApprovalDocuments().length,
    pendingReception: documents.filter(d => d.status === 'aprobado'
      && Array.isArray(d.lineasDetalle) && d.lineasDetalle.length > 0).length
  };
}

export function renderDashboard(){
  const counts = recordCounts();
  const labels = getConfig().labels;

  const entitiesValue = document.getElementById('stat-entities');
  if(entitiesValue) entitiesValue.textContent = String(counts.entities);
  const documentsValue = document.getElementById('stat-documents');
  if(documentsValue) documentsValue.textContent = String(counts.documents);
  const pendingApprovalsValue = document.getElementById('stat-pending-approvals');
  if(pendingApprovalsValue) pendingApprovalsValue.textContent = String(counts.pendingApprovals);
  const pendingReceptionValue = document.getElementById('stat-pending-reception');
  if(pendingReceptionValue) pendingReceptionValue.textContent = String(counts.pendingReception);

  const entitiesLabel = document.getElementById('stat-entities-label');
  if(entitiesLabel) entitiesLabel.textContent = labels.entities;
  const documentsLabel = document.getElementById('stat-documents-label');
  if(documentsLabel) documentsLabel.textContent = labels.documents;
}

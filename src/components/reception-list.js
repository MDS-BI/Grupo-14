function normalizeText(value){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function folioLabelFor(order){
  return `${order.series ? `${order.series}-` : ''}${order.folio ?? ''}`;
}

export function filterReceptionOrders(orders, search = '', status = ''){
  const term = normalizeText(search).trim();
  return (orders || []).filter(order => {
    if(status && order.status !== status) return false;
    if(!term) return true;
    return normalizeText(folioLabelFor(order)).includes(term) || normalizeText(order.proveedor).includes(term);
  });
}

export function renderReceptionInbox(container, emptyEl, orders, onSelect, selectedId = null){
  if(!container) return;
  container.innerHTML = '';
  if(!orders || orders.length === 0){
    if(emptyEl) emptyEl.hidden = false;
    return;
  }
  if(emptyEl) emptyEl.hidden = true;
  for(const order of orders){
    const li = document.createElement('li');
    li.className = 'entity-item';
    if(order.id === selectedId) li.classList.add('is-selected');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.dataset.orderId = order.id;
    btn.textContent = `${folioLabelFor(order)} · ${order.status} · ${order.startDate || ''}`;
    btn.addEventListener('click', () => onSelect && onSelect(order));
    li.appendChild(btn);
    const provider = document.createElement('div');
    provider.className = 'muted';
    provider.textContent = `Proveedor: ${order.proveedor || '—'}`;
    li.appendChild(provider);
    container.appendChild(li);
  }
}

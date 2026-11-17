export function renderReceptionInbox(container, emptyEl, orders, onSelect){
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    const folio = `${order.series ? `${order.series}-` : ''}${order.folio}`;
    btn.textContent = `${folio} · ${order.status} · ${order.startDate || ''}`;
    btn.addEventListener('click', () => onSelect && onSelect(order));
    li.appendChild(btn);
    container.appendChild(li);
  }
}

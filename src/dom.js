function escapeHtml(value){
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function el(tag, attrs = {}, children = []){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if(key === 'text') node.textContent = value;
    else if(key === 'class') node.className = value;
    else if(key === 'html') node.innerHTML = value;
    else if(value !== undefined && value !== null) node.setAttribute(key, value);
  });
  children.forEach(child => node.appendChild(child));
  return node;
}

function qs(id){ return document.getElementById(id); }

const dirtyForms = new WeakSet();

function markDirty(form){
  if(form) dirtyForms.add(form);
  else dirtyForms.add(document);
}

function clearDirty(form){
  if(form) dirtyForms.delete(form);
  else dirtyForms.delete(document);
}

function isDirty(form){
  if(form) return dirtyForms.has(form);
  return dirtyForms.has(document) || Array.from(document.querySelectorAll('form')).some(f => dirtyForms.has(f));
}

function confirmDiscard(){
  if(!isDirty()) return true;
  const message = 'Tienes cambios sin guardar. ¿Descartarlos y continuar?';
  return typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(message) : true;
}

function showConflict(container, message, handlers = {}){
  if(!container) return;
  container.textContent = '';
  const text = el('p', { text: message });
  const reload = el('button', { type: 'button', text: 'Recargar', 'data-action': 'reload' });
  const retry = el('button', { type: 'button', text: 'Reintentar', 'data-action': 'retry' });
  reload.addEventListener('click', () => handlers.reload && handlers.reload());
  retry.addEventListener('click', () => handlers.retry && handlers.retry());
  container.append(text, reload, retry);
}

export { escapeHtml, el, qs, markDirty, clearDirty, isDirty, confirmDiscard, showConflict };

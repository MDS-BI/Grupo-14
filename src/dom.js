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

export { escapeHtml, el, qs };

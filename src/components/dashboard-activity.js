// Capa de presentación del rediseño de la interfaz.
//
// Solo lee datos (funciones load* de storage.js) y reutiliza los botones que
// app.js ya cablea: no modifica estado ni reglas de negocio. Se encarga de:
//   - "Solicitudes pendientes" y "Actividad reciente" del panel, con estado vacío;
//   - el buscador de la barra superior (abre Búsqueda con el término escrito);
//   - las iniciales de la sesión activa y la fecha del panel;
//   - el color de las etiquetas de estado según su texto.
import { currentUser } from '../auth.js';
import { loadEntities, loadDocuments, loadReceptions, listRequisitionsForUser, REQUISITION_STATUS } from '../storage.js';
import { labelFor } from '../module-config.js';

const $ = (id) => document.getElementById(id);

function isVisible(el){
  return Boolean(el) && !el.hidden;
}

function folioOf(doc){
  return `${doc.series ? `${doc.series}-` : ''}${doc.folio}`;
}

const dateFmt = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

function whenLabel(iso){
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? `Hoy, ${timeFmt.format(d)}` : dateFmt.format(d);
}

function el(tag, className, text){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text !== undefined) node.textContent = text;
  return node;
}

// ---------------------------------------------------------------------------
// Tono de las etiquetas de estado
// ---------------------------------------------------------------------------
const TONES = [
  [/pendiente/i, 'amber'],
  [/rechaz|inactiv/i, 'red'],
  [/parcial/i, 'sky'],
  [/aprob|emitid|recibid|activo/i, 'green']
];

export function toneFor(text){
  const found = TONES.find(([re]) => re.test(String(text || '')));
  return found ? found[1] : 'neutral';
}

function tintBadges(root){
  root.querySelectorAll('.status-badge').forEach(badge => {
    const tone = toneFor(badge.textContent);
    if(badge.dataset.tone !== tone) badge.dataset.tone = tone;
  });
}

// ---------------------------------------------------------------------------
// Panel: solicitudes pendientes
// ---------------------------------------------------------------------------
function renderPending(){
  const list = $('dash-pending-list');
  const empty = $('dash-pending-empty');
  if(!list || !empty) return;
  const user = currentUser();
  const heading = $('dash-pending-heading');
  if(heading) heading.textContent = user?.role === 'solicitante' ? 'Mis solicitudes' : 'Solicitudes pendientes';
  if(user?.role === 'solicitante'){
    const title = empty.querySelector('h3');
    const copy = empty.querySelector('p');
    if(title) title.textContent = 'Todavía no tienes solicitudes';
    if(copy) copy.textContent = 'Cuando envíes tu primera solicitud aparecerá aquí con su estado.';
  }
  const scoped = listRequisitionsForUser(user);
  const pending = (user?.role === 'solicitante' ? scoped : scoped.filter(r => r.status === REQUISITION_STATUS.PENDING))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 5);

  list.replaceChildren();
  list.hidden = pending.length === 0;
  empty.hidden = pending.length > 0;

  for(const r of pending){
    const li = el('li', 'feed-item');
    const lines = Array.isArray(r.lineasDetalle) ? r.lineasDetalle.length : 0;
    const icon = el('span', 'feed-icon tone-amber');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = (r.department || 'G').slice(0, 2).toUpperCase();
    const body = el('div', 'feed-body');
    const top = el('div', 'feed-top');
    top.append(el('strong', 'folio', r.folio || r.id), el('span', 'status-badge', r.status));
    body.append(top, el('p', 'feed-text', r.justification || ''));
    body.append(el('p', 'feed-meta', [r.department, r.requesterName || 'Solicitante', `${lines} línea(s)`, whenLabel(r.createdAt)].filter(Boolean).join(' · ')));
    li.append(icon, body);
    list.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Panel: actividad reciente
// ---------------------------------------------------------------------------
function collectEvents(){
  const events = [];
  const entityLabel = labelFor('entity');
  const documentLabel = labelFor('document');

  for(const r of listRequisitionsForUser()){
    events.push({ at: r.createdAt, tone: 'amber', title: `Nueva solicitud ${r.folio || ''}`, meta: [r.requesterName, r.department].filter(Boolean).join(' · ') });
    if(r.approvedAt) events.push({ at: r.approvedAt, tone: 'green', title: `Solicitud ${r.folio || ''} aprobada`, meta: r.department });
    if(r.rejectedAt) events.push({ at: r.rejectedAt, tone: 'red', title: `Solicitud ${r.folio || ''} rechazada`, meta: r.rejectionReason || r.department });
  }
  const entities = loadEntities();
  for(const e of entities){
    events.push({ at: e.createdAt, tone: 'accent', title: `Alta de ${entityLabel.toLowerCase()}: ${e.name}`, meta: e.code });
  }
  for(const d of loadDocuments()){
    const owner = entities.find(e => e.entity_id === d.entity_id);
    const subject = `${documentLabel.toLowerCase()} ${folioOf(d)}`;
    events.push({ at: d.createdAt, tone: 'sky', title: `Alta de ${subject}`, meta: [owner && owner.name, d.status].filter(Boolean).join(' · ') });
    if(d.approvedAt) events.push({ at: d.approvedAt, tone: 'green', title: `Aprobación de ${subject}`, meta: owner && owner.name });
    if(d.cancelledAt) events.push({ at: d.cancelledAt, tone: 'red', title: `Cancelación de ${subject}`, meta: owner && owner.name });
  }
  for(const rc of loadReceptions()){
    events.push({ at: rc.createdAt || rc.fechaRecepcion, tone: 'slate', title: `Recepción de ${rc.orderFolio || 'orden'}`, meta: rc.responsable });
  }
  return events
    .filter(ev => ev.at)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, 6);
}

function renderActivity(){
  const list = $('dash-activity-list');
  const empty = $('dash-activity-empty');
  if(!list || !empty) return;
  const events = collectEvents();
  list.replaceChildren();
  list.hidden = events.length === 0;
  empty.hidden = events.length > 0;
  for(const ev of events){
    const li = el('li', 'timeline-item');
    const dot = el('span', `timeline-dot tone-${ev.tone}`);
    dot.setAttribute('aria-hidden', 'true');
    const body = el('div', 'timeline-body');
    body.append(el('p', 'timeline-title', ev.title.replace(/\s+/g, ' ').trim()));
    const meta = [ev.meta, whenLabel(ev.at)].filter(Boolean).join(' · ');
    if(meta) body.append(el('p', 'timeline-meta', meta));
    li.append(dot, body);
    list.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Botones que delegan en controles existentes (data-proxy="<id>")
// ---------------------------------------------------------------------------
function syncProxies(){
  document.querySelectorAll('[data-proxy]').forEach(btn => {
    btn.hidden = !isVisible($(btn.dataset.proxy));
  });
}

function wireProxies(){
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-proxy]');
    if(!btn) return;
    const target = $(btn.dataset.proxy);
    if(isVisible(target)) target.click();
  });
}

// ---------------------------------------------------------------------------
// Buscador de la barra superior
// ---------------------------------------------------------------------------
function wireGlobalSearch(){
  const input = $('global-search');
  const box = input && input.closest('.topbar-search');
  if(!input || !box) return;

  const run = () => {
    const nav = $('nav-search');
    const target = $('search-input');
    if(!isVisible(nav) || !target) return;
    if($('view-search').hidden) nav.click();
    ['entity-table-search', 'search-input', 'doc-search-input'].forEach(id => {
      const mirror = $(id);
      if(!mirror) return;
      mirror.value = input.value;
      mirror.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  input.addEventListener('input', () => { if(input.value.trim() !== '' || !$('view-search').hidden) run(); });
  input.addEventListener('keydown', (ev) => {
    if(ev.key === 'Enter'){ ev.preventDefault(); run(); }
    if(ev.key === 'Escape'){ input.value = ''; input.blur(); }
  });
  document.addEventListener('keydown', (ev) => {
    if(ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if(/INPUT|TEXTAREA|SELECT/.test(tag) || box.hidden) return;
    ev.preventDefault();
    input.focus();
  });
}

function syncGlobalSearch(){
  const box = document.querySelector('.topbar-search');
  if(box) box.hidden = !isVisible($('nav-search'));
}

// ---------------------------------------------------------------------------
// Sesión y fecha
// ---------------------------------------------------------------------------
function initialsOf(text){
  const name = String(text || '').split('·')[0].trim();
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function syncAvatar(){
  const select = $('session-user');
  const avatar = $('session-avatar');
  if(!select || !avatar) return;
  const option = select.options[select.selectedIndex];
  const letters = option ? initialsOf(option.textContent) : '';
  if(!letters) return;
  if(avatar.dataset.initials !== letters){
    avatar.dataset.initials = letters;
    avatar.textContent = letters;
  }
}

function showDate(){
  const chip = $('dashboard-date');
  if(!chip) return;
  const text = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  chip.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  chip.hidden = false;
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
let queued = false;
function refresh(){
  if(queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderPending();
    renderActivity();
    syncProxies();
    syncGlobalSearch();
    syncAvatar();
    tintBadges(document);
  });
}

function start(){
  const app = $('app');
  const nav = document.querySelector('.side-nav');
  const session = $('session-user');

  showDate();
  wireProxies();
  wireGlobalSearch();
  refresh();

  // renderDashboard() reescribe las cifras del panel en cada visita y tras cada
  // alta: ese es el momento de volver a leer las listas.
  const stats = document.querySelector('.stat-grid');
  if(stats) new MutationObserver(refresh).observe(stats, { subtree: true, childList: true, characterData: true });
  // Los permisos ocultan módulos y acciones al cambiar de sesión.
  if(nav) new MutationObserver(refresh).observe(nav, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  if(app) new MutationObserver(() => tintBadges(app)).observe(app, { subtree: true, childList: true });
  if(session){
    session.addEventListener('change', refresh);
    new MutationObserver(refresh).observe(session, { childList: true });
  }
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

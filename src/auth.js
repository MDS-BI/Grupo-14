import { getConfig } from './module-config.js';

const SESSION_KEY = 'erp_base_module:session';
const USERS_KEY = 'erp_base_module:users';

function readUsers(){
  try{
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    return [];
  }
}

export const ROLES = Object.freeze({
  solicitante: Object.freeze({
    label: 'Solicitante',
    story: 'Historia de Usuario 7',
    description: 'Registra solicitudes de productos o servicios con la justificación obligatoria de la compra.',
    capabilities: [
      'Crear solicitudes de compra con productos y cantidades',
      'Redactar la justificación obligatoria de la necesidad',
      'Consultar el estado y las observaciones de sus solicitudes'
    ],
    permissions: ['dashboard:view', 'entity:view', 'document:view', 'request:create', 'search:use']
  }),
  compras: Object.freeze({
    label: 'Encargado de Compras',
    story: 'Historias de Usuario 2 y 3',
    description: 'Genera órdenes de compra con líneas de detalle y totales, y aprueba o cancela solicitudes de cotización.',
    capabilities: [
      'Crear órdenes de compra vinculadas a un proveedor',
      'Calcular subtotales, impuestos y total por líneas',
      'Aprobar o cancelar solicitudes con serie/folio oficial',
      'Validar datos comerciales y límite de crédito del proveedor'
    ],
    permissions: ['dashboard:view', 'entity:view', 'entity:manage', 'document:view', 'document:manage', 'document:approve', 'request:view', 'search:use']
  }),
  aprobador: Object.freeze({
    label: 'Aprobador / Jefe de área',
    story: 'Historia de Usuario 4',
    description: 'Revisa, autoriza o rechaza las solicitudes de compra generadas por los miembros de su departamento.',
    capabilities: [
      'Ver solicitudes pendientes de su departamento',
      'Revisar justificación, líneas y presupuesto disponible',
      'Autorizar solicitudes hacia la cola de adquisiciones',
      'Rechazar solicitudes con motivo obligatorio'
    ],
    permissions: ['dashboard:view', 'entity:view', 'document:view', 'request:view', 'request:approve', 'search:use']
  }),
  recepcion: Object.freeze({
    label: 'Encargado de Recepción',
    story: 'Historia de Usuario 6',
    description: 'Verifica y registra la llegada de productos contra las órdenes de compra emitidas.',
    capabilities: [
      'Ver órdenes emitidas o recibidas parcialmente',
      'Registrar cantidades recibidas por línea',
      'Marcar líneas rechazadas con su motivo',
      'Actualizar el estado de la orden según lo recibido'
    ],
    permissions: ['dashboard:view', 'entity:view', 'document:view', 'order:view', 'reception:view', 'reception:create', 'search:use']
  }),
  administrador: Object.freeze({
    label: 'Administrador del sistema',
    story: 'Historia de Usuario 1',
    description: 'Gestiona usuarios, roles y permisos del módulo para controlar el acceso a funcionalidades y acciones.',
    capabilities: [
      'Crear y editar usuarios asignándoles un rol',
      'Ver el listado completo de usuarios y sus roles',
      'Impedir la desactivación de usuarios con trámites pendientes',
      'Acceso total a los módulos y acciones del sistema'
    ],
    permissions: ['*']
  })
});

export const ROLE_KEYS = Object.freeze(Object.keys(ROLES));

const BOOTSTRAP_ADMIN = Object.freeze({
  id: '__bootstrap__',
  name: 'Administrador',
  username: 'admin',
  role: 'administrador',
  active: true
});

export function roleLabel(roleKey){
  const configured = getConfig().roles && getConfig().roles[roleKey];
  return configured && configured.label ? configured.label : (ROLES[roleKey] ? ROLES[roleKey].label : roleKey);
}

export function rolePermissions(roleKey){
  const configured = getConfig().roles && getConfig().roles[roleKey];
  if(configured && Array.isArray(configured.permissions)) return configured.permissions;
  return ROLES[roleKey] ? ROLES[roleKey].permissions : [];
}

export function roleDescription(roleKey){
  const configured = getConfig().roles && getConfig().roles[roleKey];
  if(configured && configured.description) return configured.description;
  return ROLES[roleKey] ? ROLES[roleKey].description : '';
}

export function roleStory(roleKey){
  const configured = getConfig().roles && getConfig().roles[roleKey];
  if(configured && configured.story) return configured.story;
  return ROLES[roleKey] ? ROLES[roleKey].story : '';
}

export function roleCapabilities(roleKey){
  const configured = getConfig().roles && getConfig().roles[roleKey];
  if(configured && Array.isArray(configured.capabilities)) return configured.capabilities;
  return ROLES[roleKey] && Array.isArray(ROLES[roleKey].capabilities) ? ROLES[roleKey].capabilities : [];
}

export function getSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){
    return null;
  }
}

export function setSession(userId){
  if(!userId){ localStorage.removeItem(SESSION_KEY); return null; }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  return getSession();
}

export function login(userId){
  return setSession(userId);
}

export function logout(){
  return setSession(null);
}

export function hasUsers(){
  return readUsers().length > 0;
}

export function getCurrentUser(){
  const users = readUsers();
  if(users.length === 0) return BOOTSTRAP_ADMIN;
  const session = getSession();
  if(!session || !session.userId || session.userId === BOOTSTRAP_ADMIN.id) return BOOTSTRAP_ADMIN;
  const user = users.find(u => u.id === session.userId && u.active !== false);
  return user || BOOTSTRAP_ADMIN;
}

export function isBootstrapProfile(user){
  return !user || user.id === BOOTSTRAP_ADMIN.id;
}

export function listProfiles(){
  const profiles = [{
    id: BOOTSTRAP_ADMIN.id,
    name: BOOTSTRAP_ADMIN.name,
    username: BOOTSTRAP_ADMIN.username,
    role: BOOTSTRAP_ADMIN.role,
    active: true,
    system: true
  }];
  readUsers().forEach(user => {
    profiles.push({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      departamento: user.departamento,
      active: user.active !== false,
      system: false
    });
  });
  return profiles;
}

export function getCurrentRole(){
  const user = getCurrentUser();
  return user ? user.role : null;
}

export function can(permission){
  const user = getCurrentUser();
  if(!user) return false;
  const permissions = rolePermissions(user.role);
  return permissions.includes('*') || permissions.includes(permission);
}

export function assertCan(permission, message){
  if(can(permission)) return true;
  throw new Error(message || 'No tienes permiso para realizar esta acción.');
}

export function availableModules(){
  return {
    dashboard: can('dashboard:view'),
    entities: can('entity:view'),
    documents: can('document:view'),
    search: can('search:use'),
    users: can('users:manage'),
    approvals: can('request:approve') || can('document:approve'),
    reception: can('reception:view')
  };
}

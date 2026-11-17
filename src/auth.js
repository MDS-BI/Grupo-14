// Catálogo de roles, permisos y sesión activa del módulo.
// La sesión por defecto es el administrador del sistema para que el módulo
// base siga siendo operable sin un backend de autenticación.

export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  SEARCH_VIEW: 'search.view',
  USERS_MANAGE: 'users.manage',
  ENTITIES_MANAGE: 'entities.manage',
  DOCUMENTS_MANAGE: 'documents.manage',
  REQUISITIONS_CREATE: 'requisitions.create',
  REQUISITIONS_APPROVE: 'requisitions.approve',
  ORDERS_CREATE: 'orders.create',
  ORDERS_APPROVE: 'orders.approve',
  RECEPTIONS_MANAGE: 'receptions.manage'
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

export const ROLES = Object.freeze({
  administrador: Object.freeze({
    label: 'Administrador',
    permissions: ALL_PERMISSIONS
  }),
  solicitante: Object.freeze({
    label: 'Solicitante',
    permissions: Object.freeze([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SEARCH_VIEW,
      PERMISSIONS.REQUISITIONS_CREATE
    ])
  }),
  aprobador: Object.freeze({
    label: 'Aprobador',
    permissions: Object.freeze([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SEARCH_VIEW,
      PERMISSIONS.REQUISITIONS_APPROVE
    ])
  }),
  encargado_compras: Object.freeze({
    label: 'Encargado de Compras',
    permissions: Object.freeze([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SEARCH_VIEW,
      PERMISSIONS.ENTITIES_MANAGE,
      PERMISSIONS.DOCUMENTS_MANAGE,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_APPROVE
    ])
  }),
  encargado_recepcion: Object.freeze({
    label: 'Encargado de Recepción',
    permissions: Object.freeze([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SEARCH_VIEW,
      PERMISSIONS.RECEPTIONS_MANAGE
    ])
  })
});

export const ROLE_KEYS = Object.freeze(Object.keys(ROLES));

const SYSTEM_SESSION = Object.freeze({
  id: 'system-admin',
  username: 'admin',
  name: 'Administrador del sistema',
  role: 'administrador',
  active: true,
  system: true
});

let session = SYSTEM_SESSION;

export function roleLabel(role){
  return (ROLES[role] && ROLES[role].label) || String(role || '');
}

export function permissionsFor(role){
  return (ROLES[role] && ROLES[role].permissions) || [];
}

export function setSession(user){
  session = user ? {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active !== false,
    system: Boolean(user.system)
  } : null;
}

export function getSession(){
  return session;
}

export function currentUser(){
  return session;
}

export function can(permission){
  if(!session || session.active === false) return false;
  return permissionsFor(session.role).includes(permission);
}

export function isAdmin(){
  return Boolean(session && session.role === 'administrador');
}

export function resetSession(){
  session = SYSTEM_SESSION;
}

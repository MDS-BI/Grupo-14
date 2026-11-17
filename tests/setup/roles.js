import { ROLES, setSession, resetSession } from '../../src/auth.js';
import { applySession } from '../../src/app.js';

export const ROLE_FIXTURES = Object.freeze({
  admin: { id: 'u-admin', username: 'admin', name: 'Ana Admin', role: 'administrador', active: true },
  solicitante: { id: 'u-sol', username: 'sol', name: 'Sofía Solicitante', role: 'solicitante', active: true },
  aprobador: { id: 'u-apr', username: 'apr', name: 'Ariel Aprobador', role: 'aprobador', active: true },
  compras: { id: 'u-com', username: 'com', name: 'Carla Compras', role: 'encargado_compras', active: true },
  recepcion: { id: 'u-rec', username: 'rec', name: 'Raúl Recepción', role: 'encargado_recepcion', active: true }
});

export function asRole(key){
  const user = ROLE_FIXTURES[key];
  if(!user) throw new Error(`Rol desconocido: ${key}`);
  setSession(user);
  if(typeof document !== 'undefined' && document.getElementById('session-user')){
    applySession(user);
  }
  return user;
}

export function clearRole(){
  resetSession();
  if(typeof document !== 'undefined' && document.getElementById('session-user')){
    applySession(null);
  }
}

export { ROLES };

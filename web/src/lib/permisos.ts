import type { RolSesion } from './sesion';

export interface EnlaceNavegacion {
  readonly ruta: string;
  readonly texto: string;
  readonly roles: readonly RolSesion[];
}

export const ENLACES: readonly EnlaceNavegacion[] = [
  { ruta: '/inicio', texto: 'Vista general', roles: ['OPERADOR', 'ADMINISTRADOR'] },
  { ruta: '/carril', texto: 'Carril', roles: ['OPERADOR'] },
  { ruta: '/caja', texto: 'Caja', roles: ['OPERADOR'] },
  { ruta: '/administracion', texto: 'Administración', roles: ['ADMINISTRADOR'] },
  { ruta: '/consulta', texto: 'Consulta', roles: ['OPERADOR', 'ADMINISTRADOR'] },
];

export function enlacesPara(rol: RolSesion): EnlaceNavegacion[] {
  return ENLACES.filter((enlace) => enlace.roles.includes(rol));
}

// Las rutas que no están en ENLACES (login, inicio) son públicas.
export function puedeAcceder(rol: RolSesion | null, ruta: string): boolean {
  const enlace = ENLACES.find(
    (e) => ruta === e.ruta || ruta.startsWith(`${e.ruta}/`),
  );
  if (!enlace) return true;
  return rol !== null && enlace.roles.includes(rol);
}

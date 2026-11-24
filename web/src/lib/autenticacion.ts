import { peticion } from './cliente-http';
import type { RolSesion, Sesion } from './sesion';

export const RUTA_INICIAL: Record<RolSesion, string> = {
  ADMINISTRADOR: '/inicio',
  OPERADOR: '/inicio',
};

export function iniciarSesion(
  nombre: string,
  contrasena: string,
): Promise<Sesion> {
  return peticion<Sesion>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ nombre, contrasena }),
  });
}

export function verificarSesion(signal: AbortSignal): Promise<{ rol: RolSesion }> {
  return peticion('/auth/sesion', {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  });
}

export const ROLES = ['OPERADOR', 'ADMINISTRADOR'] as const;
export type RolSesion = (typeof ROLES)[number];

export interface Sesion {
  readonly token: string;
  readonly rol: RolSesion;
}

const CLAVE = 'carq.sesion';
const EVENTO = 'carq:sesion';

export function parsearSesion(cruda: string): Sesion | null {
  try {
    const dato = JSON.parse(cruda) as Partial<Sesion>;
    if (typeof dato.token === 'string' && dato.token.trim() && dato.rol && ROLES.includes(dato.rol)) {
      return { token: dato.token, rol: dato.rol };
    }
  } catch {
    // JSON dañado: se trata como si no hubiera sesión.
  }
  return null;
}

export function leerSesionCruda(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(CLAVE);
}

export function obtenerToken(): string | null {
  const cruda = leerSesionCruda();
  return cruda ? (parsearSesion(cruda)?.token ?? null) : null;
}

export function guardarSesion(sesion: Sesion): void {
  window.sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
  window.dispatchEvent(new Event(EVENTO));
}

export function limpiarSesion(): void {
  window.sessionStorage.removeItem(CLAVE);
  window.dispatchEvent(new Event(EVENTO));
}

export function suscribirSesion(avisar: () => void): () => void {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

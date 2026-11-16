const CLAVE_TOKEN = 'carq.token';

export function obtenerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(CLAVE_TOKEN);
}

export function guardarToken(token: string): void {
  window.sessionStorage.setItem(CLAVE_TOKEN, token);
}

export function limpiarToken(): void {
  window.sessionStorage.removeItem(CLAVE_TOKEN);
}
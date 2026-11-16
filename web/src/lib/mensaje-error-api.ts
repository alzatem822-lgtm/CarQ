import { ErrorApi } from './cliente-http';

/**
 * Texto para mostrar al usuario cuando falla una llamada a la API.
 * Usa el `motivo` que la API envía en `{codigo, motivo}`; si no hay
 * (sin conexión, respuesta inesperada), devuelve el mensaje de respaldo.
 */
export function mensajeDeErrorApi(error: unknown, respaldo: string): string {
  if (
    error instanceof ErrorApi &&
    typeof error.cuerpo === 'object' &&
    error.cuerpo
  ) {
    const motivo = (error.cuerpo as { motivo?: unknown }).motivo;
    if (typeof motivo === 'string' && motivo.trim() !== '') return motivo;
  }
  return respaldo;
}
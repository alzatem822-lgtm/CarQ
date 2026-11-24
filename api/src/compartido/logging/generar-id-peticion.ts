import { randomUUID } from 'node:crypto';

export function generarIdPeticion(
  cabeceras: Record<string, string | string[] | undefined>,
): string {
  const existente = cabeceras['x-request-id'];
  return typeof existente === 'string' && existente.length > 0
    ? existente
    : randomUUID();
}
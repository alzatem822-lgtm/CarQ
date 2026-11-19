import { QueryFailedError } from 'typeorm';

export function esUnicidad(error: unknown, restriccion: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const detalle = error.driverError as { code?: string; constraint?: string };
  return detalle.code === '23505' && detalle.constraint === restriccion;
}

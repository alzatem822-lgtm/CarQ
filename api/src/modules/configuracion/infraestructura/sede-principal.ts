import { DataSource } from 'typeorm';

/**
 * Devuelve el id de la sede con la que trabaja el sistema. Hoy hay una sola;
 * se toma la de menor id, igual que hace ParametroRepositoryPostgres.
 */
export async function obtenerIdSedePrincipal(
  origen: DataSource,
): Promise<string> {
  const filas: { id: number }[] = await origen.query(
    `SELECT id FROM sede ORDER BY id LIMIT 1`,
  );
  if (filas.length === 0) {
    throw new Error('No hay sede configurada; falta ejecutar el seed');
  }
  return String(filas[0].id);
}
import { DataSource } from 'typeorm';

const NOMBRE_SEDE = 'Sede principal';
const NOMBRE_CARRIL = 'Carril 1';

export async function sembrarSedeYCarril(origen: DataSource): Promise<void> {
  await origen.query(
    `INSERT INTO sede (nombre) VALUES ($1) ON CONFLICT (nombre) DO NOTHING`,
    [NOMBRE_SEDE],
  );
  await origen.query(
    `INSERT INTO carril (sede_id, nombre)
     SELECT id, $2 FROM sede WHERE nombre = $1
     ON CONFLICT (sede_id, nombre) DO NOTHING`,
    [NOMBRE_SEDE, NOMBRE_CARRIL],
  );
}
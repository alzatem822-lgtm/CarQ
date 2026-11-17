import { DataSource } from 'typeorm';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

const TABLA_MIGRACIONES = 'migrations';

/**
 * Abre la conexión a la base de pruebas y deja el esquema al día.
 * Se niega a conectar si la base no es de pruebas, porque la limpieza
 * borra todos los datos.
 */
export async function iniciarBaseDatosPruebas(): Promise<DataSource> {
  const url = process.env.URL_BASE_DATOS_PRUEBAS;
  if (!url) {
    throw new Error('Falta URL_BASE_DATOS_PRUEBAS en el entorno de pruebas');
  }
  if (!url.includes('_pruebas')) {
    throw new Error(
      'URL_BASE_DATOS_PRUEBAS debe apuntar a una base cuyo nombre termine en _pruebas',
    );
  }
  const origen = new DataSource({
    type: 'postgres',
    url,
    migrations: [__dirname + '/../base-datos/migraciones/*.{ts,js}'],
    migrationsTableName: TABLA_MIGRACIONES,
  });
  await origen.initialize();
  await origen.runMigrations();
  return origen;
}

/** Vacía todas las tablas del esquema, menos la de migraciones. */
export async function limpiarBaseDatosPruebas(
  origen: DataSource,
): Promise<void> {
  const filas: { tablename: string }[] = await origen.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> $1`,
    [TABLA_MIGRACIONES],
  );
  if (filas.length === 0) {
    return;
  }
  const tablas = filas.map((f) => `"${f.tablename}"`).join(', ');
  await origen.query(`TRUNCATE ${tablas} RESTART IDENTITY CASCADE`);
}
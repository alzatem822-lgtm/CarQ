import { DataSource } from 'typeorm';
import { sembrarUmbral } from './umbral.seed';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

const NOMBRE_SEDE = 'Sede principal';

describe('sembrarUmbral (integracion)', () => {
  const origen = new DataSource({
    type: 'postgres',
    url: process.env.URL_BASE_DATOS_MIGRACIONES ?? process.env.URL_BASE_DATOS,
  });

  async function leerUmbral(): Promise<number[]> {
    const filas: { umbral: number }[] = await origen.query(
      `SELECT p.umbral_confianza::float8 AS umbral
       FROM parametro_sede p
       JOIN sede s ON s.id = p.sede_id
       WHERE s.nombre = $1`,
      [NOMBRE_SEDE],
    );
    return filas.map((fila) => fila.umbral);
  }

  beforeAll(async () => {
    await origen.initialize();
    await sembrarUmbral(origen);
  });

  afterAll(async () => {
    await origen.destroy();
  });

  it('existe un umbral entre 0 y 1 tras el seed', async () => {
    const umbrales = await leerUmbral();

    expect(umbrales).toHaveLength(1);
    expect(umbrales[0]).toBeGreaterThanOrEqual(0);
    expect(umbrales[0]).toBeLessThanOrEqual(1);
  });

  it('repetir el seed no duplica la fila', async () => {
    await sembrarUmbral(origen);

    expect(await leerUmbral()).toHaveLength(1);
  });

  it('repetir el seed no pisa un umbral ya editado', async () => {
    const [original] = await leerUmbral();
    const editado = original === 0.55 ? 0.65 : 0.55;
    const cambiar = (valor: number) =>
      origen.query(
        `UPDATE parametro_sede SET umbral_confianza = $2
         WHERE sede_id = (SELECT id FROM sede WHERE nombre = $1)`,
        [NOMBRE_SEDE, valor],
      );

    await cambiar(editado);
    try {
      await sembrarUmbral(origen);

      expect(await leerUmbral()).toEqual([editado]);
    } finally {
      await cambiar(original);
    }
  });
});
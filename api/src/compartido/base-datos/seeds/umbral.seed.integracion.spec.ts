import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../pruebas/base-datos-pruebas';
import { sembrarUmbral } from './umbral.seed';

const NOMBRE_SEDE = 'Sede principal';

describe('sembrarUmbral (integracion)', () => {
  let origen: DataSource;

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
    origen = await iniciarBaseDatosPruebas();
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    await origen.query(`INSERT INTO sede (nombre) VALUES ($1)`, [NOMBRE_SEDE]);
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
    await origen.query(
      `UPDATE parametro_sede SET umbral_confianza = $2
       WHERE sede_id = (SELECT id FROM sede WHERE nombre = $1)`,
      [NOMBRE_SEDE, editado],
    );

    await sembrarUmbral(origen);

    expect(await leerUmbral()).toEqual([editado]);
  });
});
import { DataSource } from 'typeorm';
import origenDatos from '../../../compartido/base-datos/origen-datos';
import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ParametroRepositoryPostgres } from './parametro.repository.postgres';

describe('ParametroRepositoryPostgres (integración, PostgreSQL real)', () => {
  let conexion: DataSource;
  let repositorio: ParametroRepositoryPostgres;
  let sedeId: number;

  beforeAll(async () => {
    conexion = await origenDatos.initialize();
    await conexion.runMigrations();
    repositorio = new ParametroRepositoryPostgres(conexion);
    const sedes: { id: number }[] = await conexion.query(
      `SELECT id FROM sede ORDER BY id LIMIT 1`,
    );
    sedeId = sedes[0].id;
  });

  beforeEach(async () => {
    await conexion.query(`DELETE FROM parametro_sede WHERE sede_id = $1`, [sedeId]);
    await conexion.query(
      `INSERT INTO parametro_sede (sede_id, umbral_confianza) VALUES ($1, 0.80)`,
      [sedeId],
    );
  });

  afterAll(async () => {
    await conexion.destroy();
  });

  it('lee el umbral existente como número', async () => {
    const umbral = await repositorio.obtenerUmbral();

    expect(umbral.valor).toBe(0.8);
  });

  it('guarda un umbral nuevo y lo devuelve en la lectura siguiente', async () => {
    await repositorio.guardarUmbral(UmbralConfianza.crear(0.65));

    expect((await repositorio.obtenerUmbral()).valor).toBe(0.65);
  });

  it('crea la fila si la sede aún no tiene umbral', async () => {
    await conexion.query(`DELETE FROM parametro_sede WHERE sede_id = $1`, [sedeId]);

    await repositorio.guardarUmbral(UmbralConfianza.crear(0.9));

    expect((await repositorio.obtenerUmbral()).valor).toBe(0.9);
  });

  it('falla al leer si la sede no tiene umbral', async () => {
    await conexion.query(`DELETE FROM parametro_sede WHERE sede_id = $1`, [sedeId]);

    await expect(repositorio.obtenerUmbral()).rejects.toThrow(
      'No hay umbral de confianza configurado',
    );
  });

  it('la base rechaza un valor fuera de rango (CHECK)', async () => {
    await expect(
      conexion.query(
        `UPDATE parametro_sede SET umbral_confianza = 1.5 WHERE sede_id = $1`,
        [sedeId],
      ),
    ).rejects.toThrow();
  });
});
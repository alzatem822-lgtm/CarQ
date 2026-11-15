import { DataSource } from 'typeorm';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoPostgresRepository } from './cupo-postgres.repository';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

const NOMBRE_SEDE = 'Sede prueba cupos';

describe('CupoPostgresRepository (integración)', () => {
  const origen = new DataSource({
    type: 'postgres',
    url: process.env.URL_BASE_DATOS_MIGRACIONES ?? process.env.URL_BASE_DATOS,
  });
  let repositorio: CupoPostgresRepository;
  let sedeId: string;

  const cuposDePrueba = async (): Promise<Cupo[]> =>
    (await repositorio.obtenerTodos()).filter((c) => c.sedeId === sedeId);

  beforeAll(async () => {
    await origen.initialize();
    repositorio = new CupoPostgresRepository(origen);
    const [fila] = await origen.query(
      `INSERT INTO sede (nombre) VALUES ($1) RETURNING id`,
      [NOMBRE_SEDE],
    );
    sedeId = String(fila.id);
  });

  afterAll(async () => {
    await origen.query(`DELETE FROM cupo WHERE sede_id = $1`, [Number(sedeId)]);
    await origen.query(`DELETE FROM sede WHERE id = $1`, [Number(sedeId)]);
    await origen.destroy();
  });

  it('guarda y lee los cupos', async () => {
    await repositorio.guardarTodos([
      Cupo.crear(sedeId, TipoVehiculo.CARRO, 3),
      Cupo.crear(sedeId, TipoVehiculo.MOTO, 5),
    ]);

    const cupos = await cuposDePrueba();

    expect(cupos).toHaveLength(2);
    expect(cupos.find((c) => c.tipoVehiculo.equals(TipoVehiculo.CARRO))?.maximo).toBe(3);
    expect(cupos.find((c) => c.tipoVehiculo.equals(TipoVehiculo.MOTO))?.maximo).toBe(5);
  });

  it('actualiza el máximo sin duplicar el cupo del tipo', async () => {
    await repositorio.guardarTodos([Cupo.crear(sedeId, TipoVehiculo.CARRO, 4)]);

    const cupos = await cuposDePrueba();

    expect(cupos).toHaveLength(2);
    expect(cupos.find((c) => c.tipoVehiculo.equals(TipoVehiculo.CARRO))?.maximo).toBe(4);
  });
});
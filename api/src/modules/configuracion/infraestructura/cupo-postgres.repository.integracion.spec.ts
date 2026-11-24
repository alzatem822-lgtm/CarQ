import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoPostgresRepository } from './cupo-postgres.repository';

describe('CupoPostgresRepository (integración)', () => {
  let origen: DataSource;
  let repositorio: CupoPostgresRepository;
  let sedeId: string;

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    repositorio = new CupoPostgresRepository(origen);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    const [fila] = await origen.query(
      `INSERT INTO sede (nombre) VALUES ($1) RETURNING id`,
      ['Sede prueba cupos'],
    );
    sedeId = String(fila.id);
  });

  afterAll(async () => {
    await origen.destroy();
  });

  it('guarda y lee los cupos', async () => {
    await repositorio.guardarTodos([
      Cupo.crear(sedeId, TipoVehiculo.CARRO, 3),
      Cupo.crear(sedeId, TipoVehiculo.MOTO, 5),
    ]);

    const cupos = await repositorio.obtenerTodos();

    expect(cupos).toHaveLength(2);
    expect(cupos.find((c) => c.tipoVehiculo.equals(TipoVehiculo.CARRO))?.maximo).toBe(3);
    expect(cupos.find((c) => c.tipoVehiculo.equals(TipoVehiculo.MOTO))?.maximo).toBe(5);
  });

  it('actualiza el máximo sin duplicar el cupo del tipo', async () => {
    await repositorio.guardarTodos([Cupo.crear(sedeId, TipoVehiculo.CARRO, 3)]);
    await repositorio.guardarTodos([Cupo.crear(sedeId, TipoVehiculo.CARRO, 4)]);

    const cupos = await repositorio.obtenerTodos();

    expect(cupos).toHaveLength(1);
    expect(cupos[0].maximo).toBe(4);
  });

  it('revierte el primer guardado si falla el segundo tipo', async () => {
    await repositorio.guardarTodos([
      Cupo.crear(sedeId, TipoVehiculo.CARRO, 3),
      Cupo.crear(sedeId, TipoVehiculo.MOTO, 5),
    ]);
    await origen.query(`CREATE FUNCTION rechazar_cupo_prueba() RETURNS trigger AS $$ BEGIN IF NEW.tipo = 'MOTO' AND NEW.maximo = 999 THEN RAISE EXCEPTION 'fallo de segundo guardado'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await origen.query(`CREATE TRIGGER fallo_cupo_prueba BEFORE INSERT OR UPDATE ON cupo FOR EACH ROW EXECUTE FUNCTION rechazar_cupo_prueba()`);
    try {
      await expect(repositorio.guardarTodos([
        Cupo.crear(sedeId, TipoVehiculo.CARRO, 20),
        Cupo.crear(sedeId, TipoVehiculo.MOTO, 999),
      ])).rejects.toThrow('fallo de segundo guardado');
      const cupos = await repositorio.obtenerTodos();
      expect(cupos.find(c => c.tipoVehiculo.equals(TipoVehiculo.CARRO))?.maximo).toBe(3);
      expect(cupos.find(c => c.tipoVehiculo.equals(TipoVehiculo.MOTO))?.maximo).toBe(5);
    } finally {
      await origen.query('DROP TRIGGER IF EXISTS fallo_cupo_prueba ON cupo');
      await origen.query('DROP FUNCTION IF EXISTS rechazar_cupo_prueba()');
    }
  });
});

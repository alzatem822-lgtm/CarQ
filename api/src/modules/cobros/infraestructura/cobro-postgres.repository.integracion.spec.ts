import type { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Franja } from '../../configuracion/dominio/franja';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { Tarifa } from '../../configuracion/dominio/tarifa';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { GenerarCobro } from '../aplicacion/generar-cobro';
import { Cobro } from '../dominio/cobro';
import { RegistroEstrategiasTarifa } from '../dominio/estrategia-tarifa';
import { tarifaCarro } from '../dominio/tarifa-por-franja';
import { CobroPostgresRepository } from './cobro-postgres.repository';

describe('Cobro en PostgreSQL', () => {
  let db: DataSource;
  let repositorio: CobroPostgresRepository;
  const placa = Placa.crear('ABC123');
  const tipoVehiculo = TipoVehiculo.CARRO;

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    repositorio = new CobroPostgresRepository(db);
  }, 30000);
  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await db.query("INSERT INTO sede (nombre) VALUES ('Sede de pruebas')");
  });
  afterAll(async () => {
    await db?.destroy();
  });

  it('rehidrata los datos y traduce la restricción de unicidad', async () => {
    const cobro = Cobro.crear({
      placa,
      tipoVehiculo,
      sedeId: 1,
      diaOperativo: '2026-11-19',
      franja: 'DIURNA',
      tarifaAplicada: 5000,
    });
    const guardado = await repositorio.guardar(cobro);
    await expect(
      repositorio.buscarPorPlacaYDia(placa, 1, '2026-11-19'),
    ).resolves.toEqual(guardado);
    await expect(repositorio.guardar(cobro)).rejects.toMatchObject({
      codigo: 'COBRO_DUPLICADO',
    });
  });

  it('devuelve el mismo registro a los dos ingresos concurrentes', async () => {
    const generar = new GenerarCobro(
      repositorio,
      {
        obtener: () => Promise.resolve(Franja.diurna(6, 18)),
        guardar: jest.fn(),
      },
      {
        obtenerTodas: () =>
          Promise.resolve([Tarifa.crear('1', tipoVehiculo, 'DIURNA', 5000)]),
        guardarTodas: jest.fn(),
      },
      new DiaOperativo(),
      new ResolverFranja(),
      new RegistroEstrategiasTarifa([tarifaCarro]),
    );
    const entrada = {
      placa,
      tipoVehiculo,
      sedeId: 1,
      ingresoEn: new Date('2026-11-19T14:00:00Z'),
    };
    const [primero, segundo] = await Promise.all([
      generar.ejecutar(entrada),
      generar.ejecutar(entrada),
    ]);
    expect(primero).not.toBeNull();
    expect(segundo?.id).toBe(primero?.id);
    expect(
      await repositorio.listarPendientes(placa, 1, '2026-11-19'),
    ).toHaveLength(1);
  });
});

import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Estancia } from '../dominio/estancia';
import { EstanciaPostgresRepository } from './estancia-postgres.repository';

describe('EstanciaPostgresRepository (integración)', () => {
  let origen: DataSource;
  let repositorio: EstanciaPostgresRepository;
  let sedeId: number;
  let carrilId: number;

  const ingresoEn = new Date('2026-11-16T14:00:00Z');
  const salidaEn = new Date('2026-11-16T16:00:00Z');

  const nueva = (placa: string, tipo: TipoVehiculo): Estancia =>
    Estancia.abrir({
      placa: Placa.crear(placa),
      sedeId,
      carrilId,
      tipoVehiculo: tipo,
      ingresoEn,
    });

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    repositorio = new EstanciaPostgresRepository(origen);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    const [sede] = await origen.query(
      `INSERT INTO sede (nombre) VALUES ($1) RETURNING id`,
      ['Sede prueba estancias'],
    );
    sedeId = sede.id;
    const [carril] = await origen.query(
      `INSERT INTO carril (sede_id, nombre) VALUES ($1, $2) RETURNING id`,
      [sedeId, 'Carril prueba'],
    );
    carrilId = carril.id;
  });

  afterAll(async () => {
    await origen.destroy();
  });

  it('abre una estancia y la devuelve con id y salida nula', async () => {
    const guardada = await repositorio.abrir(
      nueva('ABC123', TipoVehiculo.CARRO),
    );

    expect(guardada.id).toEqual(expect.any(Number));
    expect(guardada.placa.valor).toBe('ABC123');
    expect(guardada.tipoVehiculo.equals(TipoVehiculo.CARRO)).toBe(true);
    expect(guardada.ingresoEn).toEqual(ingresoEn);
    expect(guardada.salidaEn).toBeNull();
  });

  it('busca la estancia abierta por placa y sede', async () => {
    await repositorio.abrir(nueva('ABC123', TipoVehiculo.CARRO));

    const encontrada = await repositorio.buscarAbiertaPorPlaca(
      Placa.crear('ABC123'),
      sedeId,
    );
    const otraPlaca = await repositorio.buscarAbiertaPorPlaca(
      Placa.crear('DEF456'),
      sedeId,
    );

    expect(encontrada?.placa.valor).toBe('ABC123');
    expect(otraPlaca).toBeNull();
  });

  it('cierra una estancia', async () => {
    const abierta = await repositorio.abrir(
      nueva('ABC123', TipoVehiculo.CARRO),
    );

    const cerrada = await repositorio.cerrar(abierta.id as number, salidaEn);

    expect(cerrada?.salidaEn).toEqual(salidaEn);
    expect(cerrada?.estaAbierta()).toBe(false);
    expect(
      await repositorio.buscarAbiertaPorPlaca(Placa.crear('ABC123'), sedeId),
    ).toBeNull();
  });

  it('no cierra dos veces la misma estancia', async () => {
    const abierta = await repositorio.abrir(
      nueva('ABC123', TipoVehiculo.CARRO),
    );
    await repositorio.cerrar(abierta.id as number, salidaEn);

    const segundoCierre = await repositorio.cerrar(
      abierta.id as number,
      new Date('2026-11-16T17:00:00Z'),
    );

    expect(segundoCierre).toBeNull();
  });

  it('cuenta solo las estancias abiertas de cada tipo', async () => {
    await repositorio.abrir(nueva('ABC123', TipoVehiculo.CARRO));
    await repositorio.abrir(nueva('DEF456', TipoVehiculo.CARRO));
    const cerrada = await repositorio.abrir(
      nueva('GHI789', TipoVehiculo.CARRO),
    );
    await repositorio.cerrar(cerrada.id as number, salidaEn);
    await repositorio.abrir(nueva('ABC12D', TipoVehiculo.MOTO));

    expect(
      await repositorio.contarAbiertasPorTipo(sedeId, TipoVehiculo.CARRO),
    ).toBe(2);
    expect(
      await repositorio.contarAbiertasPorTipo(sedeId, TipoVehiculo.MOTO),
    ).toBe(1);
  });

  it('rechaza una segunda estancia abierta de la misma placa y sede', async () => {
    await repositorio.abrir(nueva('ABC123', TipoVehiculo.CARRO));

    await expect(
      repositorio.abrir(nueva('ABC123', TipoVehiculo.CARRO)),
    ).rejects.toThrow();
  });

  it('permite abrir otra estancia de la placa después de cerrar la anterior', async () => {
    const primera = await repositorio.abrir(
      nueva('ABC123', TipoVehiculo.CARRO),
    );
    await repositorio.cerrar(primera.id as number, salidaEn);

    const segunda = await repositorio.abrir(
      nueva('ABC123', TipoVehiculo.CARRO),
    );

    expect(segunda.id).not.toBe(primera.id);
    expect(segunda.estaAbierta()).toBe(true);
  });
});
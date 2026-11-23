import type { DataSource } from 'typeorm';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { GenerarCobro } from '../../cobros/aplicacion/generar-cobro';
import { Cobro } from '../../cobros/dominio/cobro';
import { RegistroEstrategiasTarifa } from '../../cobros/dominio/estrategia-tarifa';
import {
  tarifaCarro,
  tarifaMoto,
} from '../../cobros/dominio/tarifa-por-franja';
import { CobroPostgresRepository } from '../../cobros/infraestructura/cobro-postgres.repository';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { FranjaPostgresRepository } from '../../configuracion/infraestructura/franja-postgres.repository';
import { TarifaPostgresRepository } from '../../configuracion/infraestructura/tarifa-postgres.repository';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Estancia } from '../dominio/estancia';
import { EvaluarCobroSalida } from './evaluar-cobro-salida';

describe('Cobro de una estancia al salir después del corte operativo', () => {
  let db: DataSource;
  let repositorio: CobroPostgresRepository;
  const anterior = '2026-11-22';
  const hoy = '2026-11-23';
  const antesDelCorte = new Date('2026-11-23T05:59:00-05:00');
  const despuesDelCorte = new Date('2026-11-23T06:10:00-05:00');
  const estancia = Estancia.abrir({
    placa: Placa.crear('ABC123'),
    sedeId: 1,
    carrilId: 1,
    tipoVehiculo: TipoVehiculo.CARRO,
    ingresoEn: new Date('2026-11-22T23:00:00-05:00'),
  });
  const rechazoPendiente = {
    autoriza: false,
    motivo: 'Cobro pendiente, pasar por caja',
  };

  function evaluador(origen: Pick<DataSource, 'query'>) {
    const cobros = new CobroPostgresRepository(origen);
    const dias = new DiaOperativo();
    return new EvaluarCobroSalida(
      dias,
      cobros,
      new GenerarCobro(
        cobros,
        new FranjaPostgresRepository(origen),
        new TarifaPostgresRepository(origen),
        dias,
        new ResolverFranja(),
        new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]),
      ),
    );
  }

  function crearCobro(diaOperativo: string) {
    return Cobro.crear({
      placa: estancia.placa,
      sedeId: estancia.sedeId,
      tipoVehiculo: estancia.tipoVehiculo,
      diaOperativo,
      franja: 'DIURNA',
      tarifaAplicada: 4100,
    });
  }

  const buscar = (dia: string) =>
    repositorio.buscarPorPlacaYDia(estancia.placa, estancia.sedeId, dia);

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    repositorio = new CobroPostgresRepository(db);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await db.query("INSERT INTO sede (nombre) VALUES ('Sede principal')");
    await sembrarTarifasYFranja(db);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it('no genera cobro al evaluar la salida antes de las 06:00 en el mismo día operativo', async () => {
    await expect(
      evaluador(db).ejecutar(estancia, antesDelCorte),
    ).resolves.toEqual({
      autoriza: true,
      motivo: 'Sin cobro exigible',
    });
    await expect(buscar(anterior)).resolves.toBeNull();
    await expect(buscar(hoy)).resolves.toBeNull();
  });

  it('genera el cobro del nuevo día usando la franja configurada a las 06:10', async () => {
    await db.query('UPDATE franja SET inicio_hora = 7 WHERE sede_id = 1');
    await expect(
      evaluador(db).ejecutar(estancia, despuesDelCorte),
    ).resolves.toEqual(rechazoPendiente);
    const cobro = await buscar(hoy);
    expect(cobro?.diaOperativo).toBe(hoy);
    expect(cobro?.franja).toBe('NOCTURNA');
    expect(cobro?.tarifaAplicada).toBe(3000);
    expect(cobro?.estado).toBe('PENDIENTE');
  });

  it('reutiliza el cobro del nuevo día y deniega por un pendiente anterior aunque el actual esté pagado', async () => {
    await repositorio.guardar(crearCobro(anterior));
    const actual = await repositorio.guardar(crearCobro(hoy));
    const pagado = actual.transicionar('PAGADO');
    await repositorio.actualizarEstado(pagado, 'PENDIENTE');

    await expect(
      evaluador(db).ejecutar(estancia, despuesDelCorte),
    ).resolves.toEqual(rechazoPendiente);
    await expect(buscar(hoy)).resolves.toEqual(pagado);
  });

  it('reutiliza un cobro pagado y permite salir cuando no hay pendientes', async () => {
    const actual = await repositorio.guardar(crearCobro(hoy));
    const pagado = actual.transicionar('PAGADO');
    await repositorio.actualizarEstado(pagado, 'PENDIENTE');

    await expect(
      evaluador(db).ejecutar(estancia, despuesDelCorte),
    ).resolves.toEqual({
      autoriza: true,
      motivo: 'Cobro pagado',
    });
    await expect(buscar(hoy)).resolves.toEqual(pagado);
  });

  it('aplica gratuidad a la moto sin crear un cobro después del corte ni en el reintento', async () => {
    const moto = Estancia.abrir({
      placa: Placa.crear('ABC12D'),
      sedeId: estancia.sedeId,
      carrilId: estancia.carrilId,
      ingresoEn: estancia.ingresoEn,
      tipoVehiculo: TipoVehiculo.MOTO,
    });
    const evaluar = evaluador(db);
    for (let intento = 0; intento < 2; intento += 1) {
      await expect(evaluar.ejecutar(moto, despuesDelCorte)).resolves.toEqual({
        autoriza: true,
        motivo: 'Sin cobro exigible',
      });
    }
    await expect(
      repositorio.buscarPorPlacaYDia(moto.placa, moto.sedeId, hoy),
    ).resolves.toBeNull();
  });

  it('crea un solo cobro si dos transacciones evalúan el nuevo día', async () => {
    const evaluarEnTransaccion = () =>
      db.transaction((gestor) =>
        evaluador(gestor).ejecutar(estancia, despuesDelCorte),
      );

    await expect(
      Promise.all([evaluarEnTransaccion(), evaluarEnTransaccion()]),
    ).resolves.toEqual([rechazoPendiente, rechazoPendiente]);
    await expect(
      repositorio.listarPendientes(estancia.placa, estancia.sedeId, hoy),
    ).resolves.toHaveLength(1);
  });

  it('mantiene utilizable la transacción al encontrar el mismo cobro por la restricción única', async () => {
    const cobro = crearCobro(hoy);
    const guardado = await repositorio.guardar(cobro);
    await db.transaction(async (gestor) => {
      const cobros = new CobroPostgresRepository(gestor);
      await expect(cobros.guardar(cobro)).rejects.toMatchObject({
        codigo: 'COBRO_DUPLICADO',
      });
      await expect(
        cobros.buscarPorPlacaYDia(cobro.placa, cobro.sedeId, hoy),
      ).resolves.toEqual(guardado);
    });
  });
});

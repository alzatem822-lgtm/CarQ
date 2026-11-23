import type { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { iniciarRedisPruebas } from '../../../compartido/pruebas/redis-pruebas';
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../../../compartido/base-datos/seeds/umbral.seed';
import { RelojSistema } from '../../../compartido/reloj/reloj-sistema';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { LectorPlaca } from '../../vehiculos/aplicacion/lector-placa';
import { LectorSimulado } from '../../vehiculos/infraestructura/lector-simulado';
import { LectorManual } from '../../vehiculos/infraestructura/lector-manual';
import { Placa } from '../../vehiculos/dominio/placa';
import { PaseVigenteRedisRepository } from '../../cobros/infraestructura/pase-vigente-redis.repository';
import { EstadoCarrilEnMemoriaStore } from '../infraestructura/estado-carril-en-memoria.store';
import { TransaccionSalidaPostgres } from '../infraestructura/transaccion-salida-postgres';
import { ProcesarSalida } from './procesar-salida';

describe('ProcesarSalida con PostgreSQL y Redis reales (CARQ-151)', () => {
  let db: DataSource;
  let redis: Redis;
  let reloj: RelojFijo;
  let estado: EstadoCarrilEnMemoriaStore;
  let pases: PaseVigenteRedisRepository;
  const dias = new DiaOperativo();
  const ahora = new RelojSistema().ahora();
  ahora.setUTCDate(ahora.getUTCDate() + 2);
  ahora.setUTCHours(15, 0, 0, 0);
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const crear = (lector: LectorPlaca = new LectorSimulado()) =>
    new ProcesarSalida(
      lector,
      reloj,
      new TransaccionSalidaPostgres(db, dias, new ResolverFranja(), pases),
      estado,
      barrera,
    );
  const salir = (placa = 'ABC123', confianza = 0.95) =>
    crear().ejecutar(1, 1, { placa, confianza }, 'operador');
  const abierta = async () =>
    (
      await db.query(
        'SELECT count(*)::int total FROM estancia WHERE salida_en IS NULL',
      )
    )[0].total as number;
  async function estancia(
    placa = 'ABC123',
    ingreso = new Date(ahora.getTime() - 60000),
  ) {
    await db.query(
      `INSERT INTO estancia (placa, sede_id, carril_id, tipo_vehiculo, ingreso_en)
      VALUES ($1, 1, 1, $2, $3)`,
      [placa, placa === 'ABC12D' ? 'MOTO' : 'CARRO', ingreso],
    );
  }
  async function cobro(estadoCobro = 'PAGADO', dia = dias.de(ahora)) {
    const [fila]: { id: number }[] = await db.query(
      `INSERT INTO cobro (placa, sede_id, tipo_vehiculo, dia_operativo, franja, tarifa_aplicada, estado, anulado_por, motivo_anulacion)
      VALUES ('ABC123', 1, 'CARRO', $1, 'DIURNA', 5000, $2, $3, $4) RETURNING id`,
      [
        dia,
        estadoCobro,
        estadoCobro === 'ANULADO' ? 'operador' : null,
        estadoCobro === 'ANULADO' ? 'Corrección' : null,
      ],
    );
    return fila.id;
  }
  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    redis = await iniciarRedisPruebas();
  }, 30000);
  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarTarifasYFranja(db);
    await sembrarUmbral(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
    reloj = new RelojFijo(ahora);
    estado = new EstadoCarrilEnMemoriaStore();
    pases = new PaseVigenteRedisRepository(redis, reloj);
  });
  afterEach(async () => {
    await redis?.del(`carq:pase:1:ABC123:${dias.de(ahora)}`);
  });
  afterAll(async () => {
    try {
      if (db?.isInitialized) await db.destroy();
    } finally {
      await redis?.quit();
    }
  });

  it('autoriza la moto gratuita, cierra la estancia y registra el evento sin crear cobro', async () => {
    await estancia('ABC12D');
    expect(await salir('ABC12D')).toEqual({
      resultado: 'AUTORIZADO',
      motivo: 'Sin cobro exigible',
    });
    expect(await abierta()).toBe(0);
    expect(await db.query('SELECT * FROM cobro')).toEqual([]);
    const [evento] = await db.query(
      'SELECT placa, sentido, resultado, operador, ocurrido_en FROM evento',
    );
    expect(evento).toEqual({
      placa: 'ABC12D',
      sentido: 'SALIDA',
      resultado: 'AUTORIZADO',
      operador: 'operador',
      ocurrido_en: ahora,
    });
    expect((await estado.obtener()).sentido).toBe('SALIDA');
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
  it.each(['PENDIENTE', 'ANULADO'])(
    'no cierra ni abre si el cobro está %s',
    async (codigo) => {
      await estancia();
      await cobro(codigo);
      expect((await salir()).resultado).toBe('RECHAZADO');
      expect(await abierta()).toBe(1);
      expect(barrera.abrir).not.toHaveBeenCalled();
      expect(barrera.denegar).toHaveBeenCalledTimes(1);
      expect(
        (await db.query('SELECT resultado FROM evento'))[0].resultado,
      ).toBe('RECHAZADO');
    },
  );
  it('sin Redis disponible verifica en PostgreSQL el cobro pagado antes de autorizar', async () => {
    await estancia();
    await cobro();
    jest
      .spyOn(pases, 'consultar')
      .mockRejectedValue(new Error('Redis desconectado'));
    expect(await salir()).toEqual({
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    expect(await abierta()).toBe(0);
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).toEqual(ahora);
  });
  it('consulta el pase en Redis real cuando no hay deuda exigible', async () => {
    await estancia();
    const id = await cobro();
    await pases.guardar({
      placa: Placa.crear('ABC123'),
      sedeId: 1,
      diaOperativo: dias.de(ahora),
      cobroId: id,
      venceEn: dias.fin(dias.de(ahora)),
    });
    const consultar = jest.spyOn(pases, 'consultar');
    expect((await salir()).resultado).toBe('AUTORIZADO');
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(await abierta()).toBe(0);
  });
  it('un pase almacenado no permite ignorar un cobro pendiente anterior', async () => {
    await estancia();
    const id = await cobro();
    const anterior = new Date(ahora.getTime() - 86400000);
    await cobro('PENDIENTE', dias.de(anterior));
    await pases.guardar({
      placa: Placa.crear('ABC123'),
      sedeId: 1,
      diaOperativo: dias.de(ahora),
      cobroId: id,
      venceEn: dias.fin(dias.de(ahora)),
    });
    expect(await salir()).toEqual({
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    expect(await abierta()).toBe(1);
    expect(barrera.abrir).not.toHaveBeenCalled();
  });
  it('registra el rechazo sin ingreso y no genera estancia ni cobro', async () => {
    expect(await salir()).toEqual({
      resultado: 'RECHAZADO',
      motivo: 'Sin ingreso registrado',
    });
    expect(await abierta()).toBe(0);
    expect(await db.query('SELECT * FROM cobro')).toEqual([]);
    expect(barrera.abrir).not.toHaveBeenCalled();
    expect((await db.query('SELECT motivo FROM evento'))[0].motivo).toBe(
      'Sin ingreso registrado',
    );
  });
  it.each([
    { placa: 'invalida', confianza: 1 },
    { placa: 'ABC123', confianza: 0.79 },
    {},
  ])(
    'no procesa cobros ni cierra con lectura insuficiente %j',
    async (solicitud) => {
      await estancia();
      expect(
        (await crear().ejecutar(1, 1, solicitud, 'operador')).resultado,
      ).toBe('REQUIERE_LECTURA_MANUAL');
      expect(await abierta()).toBe(1);
      expect(barrera.abrir).not.toHaveBeenCalled();
      expect(await db.query('SELECT * FROM cobro')).toEqual([]);
    },
  );
  it('conserva la identidad del operador en la salida manual', async () => {
    await estancia('ABC12D');
    expect(
      (
        await crear(new LectorManual()).ejecutar(
          1,
          1,
          { placa: 'ABC12D' },
          'operador',
        )
      ).resultado,
    ).toBe('AUTORIZADO');
    expect(
      (
        await db.query('SELECT operador, origen, lectura_manual FROM evento')
      )[0],
    ).toEqual({ operador: 'operador', origen: 'MANUAL', lectura_manual: true });
  });
  it('confirma el cobro del nuevo día junto al rechazo para permitir pagarlo en Caja', async () => {
    const ayer = new Date(ahora.getTime() - 86400000);
    await estancia('ABC123', ayer);
    await cobro('PAGADO', dias.de(ayer));
    expect(await salir()).toEqual({
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    expect(
      await db.query(
        'SELECT estado, franja, tarifa_aplicada FROM cobro WHERE dia_operativo = $1',
        [dias.de(ahora)],
      ),
    ).toEqual([
      { estado: 'PENDIENTE', franja: 'DIURNA', tarifa_aplicada: 5000 },
    ]);
    expect(await abierta()).toBe(1);
    await db.query("UPDATE cobro SET estado = 'PAGADO'");
    expect((await salir()).resultado).toBe('AUTORIZADO');
    expect(await abierta()).toBe(0);
    expect(
      (await db.query('SELECT count(*)::int total FROM cobro'))[0].total,
    ).toBe(2);
  });
  it.each(['evento', 'estancia'])(
    'revierte el cierre y no ordena barrera si falla %s',
    async (tabla) => {
      await estancia();
      await cobro();
      await db.query(
        "CREATE FUNCTION fallar_salida_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado de salida'; END $$",
      );
      try {
        await db.query(
          `CREATE TRIGGER fallo_salida BEFORE ${tabla === 'evento' ? 'INSERT' : 'UPDATE'} ON ${tabla} FOR EACH ROW EXECUTE FUNCTION fallar_salida_prueba()`,
        );
        await expect(salir()).rejects.toThrow('Fallo controlado de salida');
        expect(await abierta()).toBe(1);
        expect(await db.query('SELECT * FROM evento')).toEqual([]);
        expect(barrera.abrir).not.toHaveBeenCalled();
        expect(barrera.denegar).not.toHaveBeenCalled();
      } finally {
        await db.query(`DROP TRIGGER IF EXISTS fallo_salida ON ${tabla}`);
        await db.query('DROP FUNCTION fallar_salida_prueba()');
      }
    },
  );
  it('revierte también el cobro del nuevo día si falla registrar el rechazo', async () => {
    const ayer = new Date(ahora.getTime() - 86400000);
    await estancia('ABC123', ayer);
    await cobro('PAGADO', dias.de(ayer));
    await db.query(
      "CREATE FUNCTION fallar_salida_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado de salida'; END $$",
    );
    try {
      await db.query(
        'CREATE TRIGGER fallo_salida BEFORE INSERT ON evento FOR EACH ROW EXECUTE FUNCTION fallar_salida_prueba()',
      );
      await expect(salir()).rejects.toThrow('Fallo controlado de salida');
      expect(await abierta()).toBe(1);
      expect(
        await db.query('SELECT * FROM cobro WHERE dia_operativo = $1', [
          dias.de(ahora),
        ]),
      ).toEqual([]);
    } finally {
      await db.query('DROP TRIGGER IF EXISTS fallo_salida ON evento');
      await db.query('DROP FUNCTION fallar_salida_prueba()');
    }
  });
  it('dos salidas simultáneas cierran una sola estancia y ordenan una sola apertura', async () => {
    await estancia();
    await cobro();
    const resultados = await Promise.all([salir(), salir()]);
    expect(resultados.map((r) => r.resultado).sort()).toEqual([
      'AUTORIZADO',
      'RECHAZADO',
    ]);
    expect(await abierta()).toBe(0);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    expect(
      (await db.query('SELECT count(*)::int total FROM evento'))[0].total,
    ).toBe(2);
  });
  it('un fallo de barrera conserva la salida confirmada y no reabre en el reintento', async () => {
    await estancia();
    await cobro();
    barrera.abrir.mockRejectedValueOnce(new Error('Barrera desconectada'));
    await expect(salir()).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    expect(await abierta()).toBe(0);
    expect((await db.query('SELECT resultado FROM evento'))[0].resultado).toBe(
      'AUTORIZADO',
    );
    expect((await salir()).motivo).toBe('Sin ingreso registrado');
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
});

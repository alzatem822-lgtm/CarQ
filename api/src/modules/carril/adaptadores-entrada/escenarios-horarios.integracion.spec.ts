import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppModule } from '../../../app.module';
import { configurarHttp } from '../../../compartido/configurar-http';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { validarEntorno } from '../../../compartido/configuracion/validar-entorno';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { iniciarRedisPruebas } from '../../../compartido/pruebas/redis-pruebas';
import { CLIENTE_REDIS } from '../../../compartido/redis/modulo-redis';
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../../../compartido/base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../../../compartido/base-datos/seeds/umbral.seed';
import { Reloj } from '../../../compartido/reloj/reloj';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';

const SECRETO = 'carq-pruebas-escenarios-horarios';
const PLACA = 'ABC226';
const CLAVES_PASE = ['2026-11-22', '2026-11-23'].map(
  (dia) => `carq:pase:1:${PLACA}:${dia}`,
);

describe('Escenarios horarios por API con PostgreSQL y Redis reales', () => {
  let app: INestApplication;
  let db: DataSource;
  let redis: Redis;
  const reloj = new RelojFijo(new Date('2026-11-23T08:00:00-05:00'));
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const token = () => jwt.sign({ sub: 'operador', rol: 'OPERADOR' }, SECRETO);
  const fijarHora = (hora: string) =>
    reloj.fijar(new Date(`2026-11-23T${hora}:00-05:00`));
  const operar = (ruta: 'ingreso' | 'salida') =>
    request(app.getHttpServer())
      .post(`/carril/${ruta}`)
      .auth(token(), { type: 'bearer' })
      .send({ placa: PLACA, confianza: 0.95 });

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    redis = await iniciarRedisPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      ZONA_HORARIA: 'America/Bogota',
      INICIO_DIA_OPERATIVO: '06:00',
      FUENTE_SENSOR: 'simulado',
      CONTROLADOR_BARRERA: 'simulado',
      LECTOR_PLACAS: 'simulado',
      JWT_SECRETO: SECRETO,
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(Reloj)
      .useValue(reloj)
      .overrideProvider(CLIENTE_REDIS)
      .useValue(redis)
      .overrideProvider(BarreraCarril)
      .useValue(barrera)
      .compile();
    app = modulo.createNestApplication();
    configurarHttp(app, entorno.URL_WEB);
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await redis.del(...CLAVES_PASE);
    for (const sembrar of [
      sembrarSedeYCarril,
      sembrarCupos,
      sembrarTarifasYFranja,
      sembrarUmbral,
    ])
      await sembrar(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    fijarHora('08:00');
    jest.clearAllMocks();
  });
  afterAll(async () => {
    if (redis?.status === 'ready') await redis.del(...CLAVES_PASE);
    await app?.close();
    redis?.disconnect();
    if (db?.isInitialized) await db.destroy();
  });

  it('CARQ-226: reingresos a las 15:00 y 22:00 conservan un único cobro diurno pagado', async () => {
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    const pendientes = await request(app.getHttpServer())
      .get(`/cobros/pendientes?placa=${PLACA}`)
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(pendientes.body.cobros).toHaveLength(1);
    const original = pendientes.body.cobros[0];
    expect(original).toMatchObject({
      diaOperativo: '2026-11-23',
      franja: 'DIURNA',
      tarifaAplicada: 5000,
      estado: 'PENDIENTE',
    });
    fijarHora('11:55');
    await request(app.getHttpServer())
      .post('/pagos/efectivo')
      .auth(token(), { type: 'bearer' })
      .send({ cobroId: original.id, referencia: 'carq-226-pago-unico' })
      .expect(200);
    fijarHora('12:00');
    await operar('salida').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    fijarHora('15:00');
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    fijarHora('16:00');
    await operar('salida').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    fijarHora('22:00');
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });

    expect(
      await db.query(
        'SELECT id, placa, dia_operativo::text, franja, tarifa_aplicada, estado FROM cobro',
      ),
    ).toEqual([
      {
        id: original.id,
        placa: PLACA,
        dia_operativo: '2026-11-23',
        franja: 'DIURNA',
        tarifa_aplicada: 5000,
        estado: 'PAGADO',
      },
    ]);
    expect(
      await db.query('SELECT cobro_id, referencia, monto FROM pago'),
    ).toEqual([
      { cobro_id: original.id, referencia: 'carq-226-pago-unico', monto: 5000 },
    ]);
    expect(
      await db.query('SELECT ingreso_en, salida_en FROM estancia ORDER BY id'),
    ).toEqual([
      {
        ingreso_en: new Date('2026-11-23T08:00:00-05:00'),
        salida_en: new Date('2026-11-23T12:00:00-05:00'),
      },
      {
        ingreso_en: new Date('2026-11-23T15:00:00-05:00'),
        salida_en: new Date('2026-11-23T16:00:00-05:00'),
      },
      { ingreso_en: new Date('2026-11-23T22:00:00-05:00'), salida_en: null },
    ]);
    expect(
      await db.query('SELECT sentido, resultado FROM evento ORDER BY id'),
    ).toEqual(
      ['ENTRADA', 'SALIDA', 'ENTRADA', 'SALIDA', 'ENTRADA'].map((sentido) => ({
        sentido,
        resultado: 'AUTORIZADO',
      })),
    );
    expect(barrera.abrir).toHaveBeenCalledTimes(5);
    expect(barrera.denegar).not.toHaveBeenCalled();
  });

  it('CARQ-229: salida tras el corte exige un nuevo cobro diurno aunque ya pagó la noche', async () => {
    fijarHora('05:50');
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    const [nocturno]: {
      id: number;
      dia_operativo: string;
      franja: string;
      tarifa_aplicada: number;
    }[] = await db.query(
      'SELECT id, dia_operativo::text, franja, tarifa_aplicada FROM cobro',
    );
    expect(nocturno).toMatchObject({
      dia_operativo: '2026-11-22',
      franja: 'NOCTURNA',
      tarifa_aplicada: 3000,
    });
    fijarHora('05:55');
    await request(app.getHttpServer())
      .post('/pagos/efectivo')
      .auth(token(), { type: 'bearer' })
      .send({ cobroId: nocturno.id, referencia: 'carq-229-pago-noche' })
      .expect(200);
    barrera.abrir.mockClear();
    fijarHora('09:00');
    // El cobro del nuevo día se evalúa al solicitar la salida; no depende de un cron.
    for (let intento = 0; intento < 2; intento++) {
      await operar('salida').expect(200, {
        resultado: 'RECHAZADO',
        motivo: 'Cobro pendiente, pasar por caja',
      });
    }
    expect(barrera.abrir).not.toHaveBeenCalled();
    expect(barrera.denegar).toHaveBeenCalledTimes(2);
    expect(await db.query('SELECT salida_en FROM estancia')).toEqual([
      { salida_en: null },
    ]);
    const cobros = await db.query(
      'SELECT id, dia_operativo::text, franja, tarifa_aplicada, estado FROM cobro ORDER BY dia_operativo',
    );
    expect(cobros).toEqual([
      {
        id: nocturno.id,
        dia_operativo: '2026-11-22',
        franja: 'NOCTURNA',
        tarifa_aplicada: 3000,
        estado: 'PAGADO',
      },
      {
        id: expect.any(Number),
        dia_operativo: '2026-11-23',
        franja: 'DIURNA',
        tarifa_aplicada: 5000,
        estado: 'PENDIENTE',
      },
    ]);
    expect(await db.query('SELECT cobro_id FROM pago')).toEqual([
      { cobro_id: nocturno.id },
    ]);
    const pendientes = await request(app.getHttpServer())
      .get(`/cobros/pendientes?placa=${PLACA}`)
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(pendientes.body.cobros).toHaveLength(1);
    expect(pendientes.body.cobros[0].id).toBe(cobros[1].id);
    await request(app.getHttpServer())
      .post('/pagos/efectivo')
      .auth(token(), { type: 'bearer' })
      .send({ cobroId: cobros[1].id, referencia: 'carq-229-pago-dia' })
      .expect(200);
    fijarHora('09:05');
    await operar('salida').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    expect(
      await db.query('SELECT ingreso_en, salida_en FROM estancia'),
    ).toEqual([
      {
        ingreso_en: new Date('2026-11-23T05:50:00-05:00'),
        salida_en: new Date('2026-11-23T09:05:00-05:00'),
      },
    ]);
    expect(
      await db.query('SELECT cobro_id, monto FROM pago ORDER BY id'),
    ).toEqual([
      { cobro_id: nocturno.id, monto: 3000 },
      { cobro_id: cobros[1].id, monto: 5000 },
    ]);
    expect(await db.query('SELECT estado FROM cobro ORDER BY id')).toEqual([
      { estado: 'PAGADO' },
      { estado: 'PAGADO' },
    ]);
    expect(
      await db.query('SELECT sentido, resultado FROM evento ORDER BY id'),
    ).toEqual([
      { sentido: 'ENTRADA', resultado: 'AUTORIZADO' },
      { sentido: 'SALIDA', resultado: 'RECHAZADO' },
      { sentido: 'SALIDA', resultado: 'RECHAZADO' },
      { sentido: 'SALIDA', resultado: 'AUTORIZADO' },
    ]);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });

  it('CARQ-228: ingreso a las 23:00 y salida a la 01:00 conservan un solo cobro nocturno', async () => {
    const ingreso = new Date('2026-11-23T23:00:00-05:00');
    const salida = new Date('2026-11-24T01:00:00-05:00');
    const dias = new DiaOperativo('America/Bogota', '06:00');
    expect(dias.de(ingreso)).toBe('2026-11-23');
    expect(dias.de(salida)).toBe('2026-11-23');
    reloj.fijar(ingreso);
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    const pendientes = await request(app.getHttpServer())
      .get(`/cobros/pendientes?placa=${PLACA}`)
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(pendientes.body.cobros).toHaveLength(1);
    const original = pendientes.body.cobros[0];
    expect(original).toMatchObject({
      franja: 'NOCTURNA',
      diaOperativo: '2026-11-23',
      tarifaAplicada: 3000,
    });
    reloj.fijar(new Date('2026-11-23T23:05:00-05:00'));
    const pago = await request(app.getHttpServer())
      .post('/pagos/efectivo')
      .auth(token(), { type: 'bearer' })
      .send({ cobroId: original.id, referencia: 'carq-228-pago-nocturno' })
      .expect(200);
    expect(pago.body).toMatchObject({
      cobro: { id: original.id, estado: 'PAGADO' },
      pago: { monto: 3000 },
    });
    reloj.fijar(salida);
    await operar('salida').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    expect(
      await db.query(
        'SELECT id, dia_operativo::text, franja, tarifa_aplicada, estado FROM cobro',
      ),
    ).toEqual([
      {
        id: original.id,
        dia_operativo: '2026-11-23',
        franja: 'NOCTURNA',
        tarifa_aplicada: 3000,
        estado: 'PAGADO',
      },
    ]);
    expect(await db.query('SELECT cobro_id, monto FROM pago')).toEqual([
      { cobro_id: original.id, monto: 3000 },
    ]);
    expect(
      await db.query('SELECT ingreso_en, salida_en FROM estancia'),
    ).toEqual([{ ingreso_en: ingreso, salida_en: salida }]);
    expect(
      await db.query(
        'SELECT sentido, resultado, ocurrido_en FROM evento ORDER BY id',
      ),
    ).toEqual([
      { sentido: 'ENTRADA', resultado: 'AUTORIZADO', ocurrido_en: ingreso },
      { sentido: 'SALIDA', resultado: 'AUTORIZADO', ocurrido_en: salida },
    ]);
    expect(barrera.abrir).toHaveBeenCalledTimes(2);
    expect(barrera.denegar).not.toHaveBeenCalled();
  });

  it('CARQ-227: primer ingreso a las 19:00 genera un único cobro nocturno menor que el diurno', async () => {
    fijarHora('19:00');
    await operar('ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    const cobros = await db.query(
      'SELECT placa, dia_operativo::text, franja, tarifa_aplicada, estado FROM cobro',
    );
    expect(cobros).toEqual([
      {
        placa: PLACA,
        dia_operativo: '2026-11-23',
        franja: 'NOCTURNA',
        tarifa_aplicada: 3000,
        estado: 'PENDIENTE',
      },
    ]);
    const [diurna]: { valor: number }[] = await db.query(
      "SELECT valor FROM tarifa WHERE tipo_vehiculo = 'CARRO' AND franja = 'DIURNA'",
    );
    expect(cobros[0].tarifa_aplicada).toBeLessThan(diurna.valor);
    expect(
      await db.query('SELECT ingreso_en, salida_en FROM estancia'),
    ).toEqual([
      { ingreso_en: new Date('2026-11-23T19:00:00-05:00'), salida_en: null },
    ]);
    expect(
      await db.query('SELECT sentido, resultado, ocurrido_en FROM evento'),
    ).toEqual([
      {
        sentido: 'ENTRADA',
        resultado: 'AUTORIZADO',
        ocurrido_en: new Date('2026-11-23T19:00:00-05:00'),
      },
    ]);
    expect(await db.query('SELECT id FROM pago')).toHaveLength(0);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    expect(barrera.denegar).not.toHaveBeenCalled();
  });
});

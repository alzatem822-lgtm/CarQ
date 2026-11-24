import type {
  DynamicModule,
  INestApplication,
  ValueProvider,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, PARAMS_PROVIDER_TOKEN, type Params } from 'nestjs-pino';
import { hash } from 'bcryptjs';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { configurarHttp } from '../configurar-http';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';
import { validarEntorno } from '../configuracion/validar-entorno';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../pruebas/base-datos-pruebas';
import { iniciarRedisPruebas } from '../pruebas/redis-pruebas';
import { CLIENTE_REDIS } from '../redis/modulo-redis';
import { sembrarSedeYCarril } from '../base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../base-datos/seeds/umbral.seed';
import { Reloj } from '../reloj/reloj';
import { RelojFijo } from '../reloj/reloj-fijo';
import { ModuloLogging } from './modulo-logging';
import { TEXTO_CENSURADO } from './rutas-censuradas';

const PLACA = 'ABC221';
const CONTRASENA = 'clave-ficticia-carq-221';
const CLAVE_PASE = `carq:pase:1:${PLACA}:2026-11-23`;

interface RegistroHttp {
  req?: {
    id: string;
    method: string;
    url: string;
    headers: Record<string, string>;
  };
  res?: { statusCode: number };
}

describe('CARQ-221: privacidad de logs en un flujo completo por API', () => {
  let app: INestApplication;
  let db: DataSource;
  let redis: Redis;
  const lineas: string[] = [];
  const reloj = new RelojFijo(new Date('2026-11-23T08:00:00-05:00'));

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    redis = await iniciarRedisPruebas();
    await limpiarBaseDatosPruebas(db);
    await redis.del(CLAVE_PASE);
    for (const sembrar of [
      sembrarSedeYCarril,
      sembrarCupos,
      sembrarTarifasYFranja,
      sembrarUmbral,
    ])
      await sembrar(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', $1, 'OPERADOR')",
      [await hash(CONTRASENA, 4)],
    );
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
      JWT_SECRETO: 'secreto-ficticio-carq-221',
      JWT_EXPIRACION: '1h',
    });
    const importaciones = Reflect.getMetadata(
      'imports',
      ModuloLogging,
    ) as DynamicModule[];
    const proveedor = importaciones[0].providers?.find(
      (valor) =>
        typeof valor === 'object' &&
        'provide' in valor &&
        valor.provide === PARAMS_PROVIDER_TOKEN,
    ) as ValueProvider<Params> | undefined;
    const parametros = proveedor?.useValue;
    if (
      !parametros?.pinoHttp ||
      Array.isArray(parametros.pinoHttp) ||
      'write' in parametros.pinoHttp
    )
      throw new Error('Se esperaba la configuración HTTP real del logger');

    // Conserva serializadores y censura de producción; solo cambia el destino.
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(Reloj)
      .useValue(reloj)
      .overrideProvider(CLIENTE_REDIS)
      .useValue(redis)
      .overrideProvider(PARAMS_PROVIDER_TOKEN)
      .useValue({
        ...parametros,
        pinoHttp: [
          parametros.pinoHttp,
          { write: (linea: string) => lineas.push(linea) },
        ],
      })
      .compile();
    app = modulo.createNestApplication();
    app.useLogger(app.get(Logger));
    configurarHttp(app, entorno.URL_WEB);
    await app.init();
    lineas.length = 0;
  }, 30000);

  afterAll(async () => {
    if (redis?.status === 'ready') await redis.del(CLAVE_PASE);
    await app?.close();
    redis?.disconnect();
    if (db?.isInitialized) await db.destroy();
  });

  it('conserva trazabilidad sin exponer placa ni credenciales en éxitos y rechazos', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-request-id', 'logs-login')
      .send({ nombre: 'operador', contrasena: CONTRASENA })
      .expect(200);
    expect(login.body).toMatchObject({
      token: expect.any(String),
      rol: 'OPERADOR',
    });
    const token = login.body.token as string;
    const autenticar = (peticion: request.Test, id: string) =>
      peticion
        .set('x-request-id', id)
        .auth(token, { type: 'bearer' })
        .set('Cookie', 'sesion=cookie-ficticia-carq-221');
    const operar = (sentido: 'ingreso' | 'salida', id: string) =>
      autenticar(
        request(app.getHttpServer()).post(`/carril/${sentido}`),
        id,
      ).send({ placa: PLACA, confianza: 0.99 });

    await operar('ingreso', 'logs-ingreso').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    reloj.fijar(new Date('2026-11-23T09:00:00-05:00'));
    await operar('salida', 'logs-deuda').expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    const pendientes = await autenticar(
      request(app.getHttpServer()).get('/cobros/pendientes'),
      'logs-pendientes',
    )
      .query({ placa: PLACA })
      .expect(200);
    expect(pendientes.body.cobros).toHaveLength(1);
    await autenticar(
      request(app.getHttpServer()).post('/pagos/efectivo'),
      'logs-pago',
    )
      .send({
        cobroId: pendientes.body.cobros[0].id,
        referencia: 'pago-carq-221',
      })
      .expect(200);
    await operar('salida', 'logs-salida').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    await autenticar(
      request(app.getHttpServer()).get('/consulta/eventos'),
      'logs-consulta',
    )
      .query({ placa: PLACA })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-request-id', 'logs-login-rechazado')
      .send({ nombre: 'operador', contrasena: 'clave-incorrecta-carq-221' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .set('x-request-id', 'logs-token-rechazado')
      .auth('token-invalido-carq-221', { type: 'bearer' })
      .expect(401);

    const registros = lineas.map((linea) => JSON.parse(linea) as RegistroHttp);
    for (const [id, method, url, statusCode] of [
      ['logs-login', 'POST', '/auth/login', 200],
      ['logs-ingreso', 'POST', '/carril/ingreso', 200],
      ['logs-deuda', 'POST', '/carril/salida', 200],
      ['logs-pendientes', 'GET', '/cobros/pendientes', 200],
      ['logs-pago', 'POST', '/pagos/efectivo', 200],
      ['logs-salida', 'POST', '/carril/salida', 200],
      ['logs-consulta', 'GET', '/consulta/eventos', 200],
      ['logs-login-rechazado', 'POST', '/auth/login', 401],
      ['logs-token-rechazado', 'GET', '/auth/sesion', 401],
    ] as const) {
      // Evita aprobar por ausencia de logs: cada petición debe estar registrada.
      expect(registros.filter((registro) => registro.req?.id === id)).toEqual([
        expect.objectContaining({
          req: expect.objectContaining({ id, method, url }),
          res: expect.objectContaining({ statusCode }),
        }),
      ]);
    }
    expect(
      registros.find((registro) => registro.req?.id === 'logs-ingreso')?.req
        ?.headers,
    ).toMatchObject({
      authorization: TEXTO_CENSURADO,
      cookie: TEXTO_CENSURADO,
    });
    const salida = lineas.join('');
    for (const sensible of [
      PLACA,
      CONTRASENA,
      token,
      'clave-incorrecta-carq-221',
      'token-invalido-carq-221',
      'cookie-ficticia-carq-221',
      'secreto-ficticio-carq-221',
    ])
      expect(salida).not.toContain(sensible);
    expect(await db.query('SELECT estado FROM cobro')).toEqual([
      { estado: 'PAGADO' },
    ]);
    expect(
      await db.query('SELECT placa FROM estancia WHERE salida_en IS NOT NULL'),
    ).toEqual([{ placa: PLACA }]);
    expect(await db.query('SELECT count(*)::int AS total FROM evento')).toEqual(
      [{ total: 3 }],
    );
  });
});

import type {
  DynamicModule,
  INestApplication,
  ValueProvider,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PARAMS_PROVIDER_TOKEN, type Params } from 'nestjs-pino';
import request from 'supertest';
import { ModuloLogging } from './modulo-logging';

describe('Privacidad del logging HTTP real (CARQ-13)', () => {
  let app: INestApplication;
  let lineas: string[];

  beforeAll(async () => {
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
    if (!proveedor)
      throw new Error('No se encontr� la configuraci�n real del logger');
    const parametros = proveedor.useValue;
    if (
      !parametros.pinoHttp ||
      Array.isArray(parametros.pinoHttp) ||
      'write' in parametros.pinoHttp
    ) {
      throw new Error(
        'Se esperaba la configuración HTTP del módulo de logging',
      );
    }
    const modulo = await Test.createTestingModule({ imports: [ModuloLogging] })
      .overrideProvider(PARAMS_PROVIDER_TOKEN)
      .useValue({
        ...parametros,
        pinoHttp: [
          parametros.pinoHttp,
          {
            write: (linea: string) => {
              lineas.push(linea);
            },
          },
        ],
      })
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    lineas = [];
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each([
    '/consulta/eventos',
    '/consulta/cobros',
    '/cobros/pendientes',
    '/ruta-futura',
  ])(
    'omite valores de consulta y credenciales al registrar %s',
    async (ruta) => {
      // No hay controladores: incluso el logging de un 404 debe proteger los filtros.
      await request(app.getHttpServer())
        .get(ruta)
        .query({
          placa: ['ABC123', 'DEF456'],
          token: 'secreto-en-url',
          filtro: 'GHI789',
        })
        .set('Authorization', 'Bearer secreto-en-cabecera')
        .set('Cookie', 'sesion=secreto-en-cookie')
        .set('x-request-id', 'peticion-regresion')
        .expect(404);
      const salida = lineas.join('');
      expect(lineas).toHaveLength(1);
      for (const sensible of [
        'ABC123',
        'DEF456',
        'GHI789',
        'secreto-en-url',
        'secreto-en-cabecera',
        'secreto-en-cookie',
      ]) {
        expect(salida).not.toContain(sensible);
      }
      expect(JSON.parse(lineas[0])).toMatchObject({
        level: 'info',
        time: expect.any(String),
        req: { id: 'peticion-regresion', method: 'GET', url: ruta },
        res: { statusCode: 404 },
      });
    },
  );
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { ConsultarOcupacion } from '../aplicacion/consultar-ocupacion';
import { OcupacionController } from './ocupacion.controller';

describe('GET /carril/ocupacion', () => {
  let app: INestApplication;
  const consultar = { ejecutar: jest.fn() };
  const resolverSede = jest.fn();
  const cupos = [
    { tipoVehiculo: 'CARRO', ocupacion: 2, maximo: 3 },
    { tipoVehiculo: 'MOTO', ocupacion: 0, maximo: 5 },
  ];

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [OcupacionController],
      providers: [
        { provide: ConsultarOcupacion, useValue: consultar },
        { provide: 'ResolverSedeCarril', useValue: resolverSede },
        {
          provide: EmisorTokens,
          useValue: {
            verificar: (token: string) => {
              if (token === 'operador') {
                return Promise.resolve({
                  nombre: 'operador',
                  rol: Rol.OPERADOR,
                });
              }
              if (token === 'admin') {
                return Promise.resolve({
                  nombre: 'admin',
                  rol: Rol.ADMINISTRADOR,
                });
              }
              return Promise.reject(new Error('Token inválido'));
            },
          },
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resolverSede.mockResolvedValue(7);
    consultar.ejecutar.mockResolvedValue(cupos);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 al operador usando la sede resuelta por el servidor', async () => {
    await request(app.getHttpServer())
      .get('/carril/ocupacion?sedeId=99')
      .set('Authorization', 'Bearer operador')
      .expect('Cache-Control', 'no-store')
      .expect(200, { cupos });

    expect(resolverSede).toHaveBeenCalledTimes(1);
    expect(consultar.ejecutar).toHaveBeenCalledWith(7);
  });

  it.each([undefined, 'invalido', 'admin'])(
    'rechaza acceso no autorizado: %s',
    async (token) => {
      const solicitud = request(app.getHttpServer()).get('/carril/ocupacion');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const respuesta = await solicitud;

      expect(respuesta.status).toBe(token === 'admin' ? 403 : 401);
      expect(respuesta.body).toEqual({
        codigo: token === 'admin' ? 'FORBIDDEN' : 'UNAUTHORIZED',
        motivo: expect.any(String),
      });
      expect(resolverSede).not.toHaveBeenCalled();
      expect(consultar.ejecutar).not.toHaveBeenCalled();
    },
  );

  it.each(['sede', 'ocupacion'])(
    'responde 500 sin filtrar detalles ni inventar datos si falla %s',
    async (paso) => {
      const error = new Error('Detalle privado de persistencia');
      if (paso === 'sede') resolverSede.mockRejectedValue(error);
      else consultar.ejecutar.mockRejectedValue(error);

      await request(app.getHttpServer())
        .get('/carril/ocupacion')
        .set('Authorization', 'Bearer operador')
        .expect(500, {
          codigo: 'ERROR_INTERNO',
          motivo: 'Error interno del servidor',
        });
    },
  );
});

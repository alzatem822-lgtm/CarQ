import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configurarHttp } from '../../../compartido/configurar-http';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { ConsultarEstadoCarril } from '../aplicacion/consultar-estado-carril';
import { EstadoCarril, estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from '../infraestructura/estado-carril-en-memoria.store';
import { EstadoCarrilController } from './estado-carril.controller';

describe('GET /carril/estado', () => {
  let app: INestApplication;
  const estado = new EstadoCarrilEnMemoriaStore();

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [EstadoCarrilController],
      providers: [
        {
          provide: ConsultarEstadoCarril,
          useValue: new ConsultarEstadoCarril(estado),
        },
        {
          provide: EmisorTokens,
          useValue: {
            verificar: (token: string) => {
              if (token === 'operador')
                return Promise.resolve({ nombre: token, rol: Rol.OPERADOR });
              if (token === 'admin')
                return Promise.resolve({
                  nombre: token,
                  rol: Rol.ADMINISTRADOR,
                });
              return Promise.reject(new Error('Token inválido'));
            },
          },
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    configurarHttp(app, 'http://localhost:3000');
    await app.init();
  });

  beforeEach(async () => {
    await estado.guardar(estadoCarrilInicial());
  });

  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it('devuelve el estado inicial con lectura y resultado nulos y sin caché', async () => {
    await request(app.getHttpServer())
      .get('/carril/estado')
      .set('Authorization', 'Bearer operador')
      .expect('Cache-Control', 'no-store')
      .expect(200, estadoCarrilInicial());
    const documento = await request(app.getHttpServer()).get('/docs-json');
    expect(documento.body.paths['/carril/estado'].get).toMatchObject({
      operationId: 'consultarEstadoCarril',
      security: [{ sesion: [] }],
    });
    expect(
      documento.body.components.schemas.EstadoCarrilRespuestaDto.properties
        .ultimoResultado,
    ).toMatchObject({ nullable: true });
  });

  it('devuelve la lectura, resultado y motivos actuales sin modificar el estado', async () => {
    const actual: EstadoCarril = {
      vehiculoPresente: true,
      sentido: 'SALIDA',
      ultimaLectura: { placa: 'ABC123', confianza: 0.95, origen: 'SIMULADO' },
      ultimoResultado: { resultado: 'RECHAZADO', motivo: 'Cobro pendiente' },
      barrera: { estado: 'CERRADA', motivo: 'Cobro pendiente' },
      requiereValidacionManual: false,
    };
    await estado.guardar(actual);
    await request(app.getHttpServer())
      .get('/carril/estado')
      .set('Authorization', 'Bearer operador')
      .expect(200, actual);
    expect(await estado.obtener()).toEqual(actual);
  });

  it.each([undefined, 'invalido', 'admin'])(
    'rechaza acceso no autorizado: %s',
    async (token) => {
      const obtener = jest.spyOn(estado, 'obtener');
      const solicitud = request(app.getHttpServer()).get('/carril/estado');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const respuesta = await solicitud;
      expect(respuesta.status).toBe(token === 'admin' ? 403 : 401);
      expect(respuesta.body).toEqual({
        codigo: token === 'admin' ? 'FORBIDDEN' : 'UNAUTHORIZED',
        motivo: expect.any(String),
      });
      expect(obtener).not.toHaveBeenCalled();
    },
  );

  it('responde 500 si falla la lectura sin inventar un carril libre', async () => {
    jest
      .spyOn(estado, 'obtener')
      .mockRejectedValue(new Error('Fallo de estado'));
    await request(app.getHttpServer())
      .get('/carril/estado')
      .set('Authorization', 'Bearer operador')
      .expect(500, {
        codigo: 'ERROR_INTERNO',
        motivo: 'Error interno del servidor',
      });
  });
});

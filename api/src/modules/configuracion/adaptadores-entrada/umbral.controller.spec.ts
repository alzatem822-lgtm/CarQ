import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { ActualizarUmbral } from '../aplicacion/actualizar-umbral';
import { ConsultarUmbral } from '../aplicacion/consultar-umbral';
import { UmbralConfianza } from '../dominio/umbral-confianza';
import { UmbralController } from './umbral.controller';

describe('/configuracion/umbral', () => {
  let app: INestApplication;
  let valorActual: number;
  let guardados: number[];

  const emisorFalso = {
    emitir: () => Promise.resolve('no se usa'),
    verificar: (token: string) => {
      if (token === 'token-admin') {
        return Promise.resolve({ nombre: 'admin', rol: Rol.ADMINISTRADOR });
      }
      if (token === 'token-operador') {
        return Promise.resolve({ nombre: 'operador', rol: Rol.OPERADOR });
      }
      return Promise.reject(new Error('token inválido'));
    },
  };
  const consultarUmbralFalso = {
    ejecutar: () => Promise.resolve(UmbralConfianza.crear(valorActual)),
  };
  const actualizarUmbralFalso = {
    ejecutar: (valor: number) => {
      guardados.push(valor);
      valorActual = valor;
      return Promise.resolve();
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [UmbralController],
      providers: [
        { provide: EmisorTokens, useValue: emisorFalso },
        { provide: ConsultarUmbral, useValue: consultarUmbralFalso },
        { provide: ActualizarUmbral, useValue: actualizarUmbralFalso },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalFilters(new FiltroExcepciones());
    app.useGlobalPipes(crearPipeValidacion());
    await app.init();
  });

  beforeEach(() => {
    valorActual = 0.8;
    guardados = [];
  });

  afterAll(async () => {
    await app.close();
  });

  const servidor = () => app.getHttpServer();
  const comoAdmin = { Authorization: 'Bearer token-admin' };
  const comoOperador = { Authorization: 'Bearer token-operador' };

  describe('GET', () => {
    it('responde 200 con el umbral al administrador', async () => {
      const respuesta = await request(servidor())
        .get('/configuracion/umbral')
        .set(comoAdmin);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ umbral: 0.8 });
    });

    it('responde 403 al operador', async () => {
      const respuesta = await request(servidor())
        .get('/configuracion/umbral')
        .set(comoOperador);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toEqual({
        codigo: 'FORBIDDEN',
        motivo: 'No tienes permiso para esta acción',
      });
    });

    it('responde 401 sin token', async () => {
      const respuesta = await request(servidor()).get('/configuracion/umbral');

      expect(respuesta.status).toBe(401);
    });
  });

  describe('PUT', () => {
    it('responde 200, guarda el umbral y lo devuelve al administrador', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .set(comoAdmin)
        .send({ umbral: 0.65 });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ umbral: 0.65 });
      expect(guardados).toEqual([0.65]);
    });

    it.each([[0], [1]])('acepta el límite %s', async (limite) => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .set(comoAdmin)
        .send({ umbral: limite });

      expect(respuesta.status).toBe(200);
      expect(guardados).toEqual([limite]);
    });

    it('responde 403 al operador y no guarda nada', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .set(comoOperador)
        .send({ umbral: 0.5 });

      expect(respuesta.status).toBe(403);
      expect(guardados).toEqual([]);
    });

    it('responde 401 sin token', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .send({ umbral: 0.5 });

      expect(respuesta.status).toBe(401);
      expect(guardados).toEqual([]);
    });

    it.each([
      ['un umbral negativo', { umbral: -0.1 }],
      ['un umbral mayor que 1', { umbral: 1.1 }],
      ['un umbral que es texto', { umbral: 'alto' }],
      ['un umbral numérico enviado como texto', { umbral: '0.5' }],
      ['un umbral nulo', { umbral: null }],
      ['un cuerpo sin umbral', {}],
    ])('responde 400 con motivo ante %s', async (_caso, cuerpo) => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .set(comoAdmin)
        .send(cuerpo);

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.codigo).toBe('BAD_REQUEST');
      expect(respuesta.body.motivo).toEqual(expect.any(String));
      expect(guardados).toEqual([]);
    });

    it('responde 400 si el cuerpo trae campos de más', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/umbral')
        .set(comoAdmin)
        .send({ umbral: 0.5, otro: true });

      expect(respuesta.status).toBe(400);
      expect(guardados).toEqual([]);
    });
  });
});
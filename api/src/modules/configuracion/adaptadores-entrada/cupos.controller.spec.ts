import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ActualizarCupo } from '../aplicacion/actualizar-cupo';
import { ConsultarCupos } from '../aplicacion/consultar-cupos';
import { Cupo } from '../dominio/cupo';
import { CuposController } from './cupos.controller';

describe('/configuracion/cupos', () => {
  let app: INestApplication;
  let guardados: { tipo: string; maximo: number }[];

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
  const consultarCuposFalso = {
    ejecutar: () =>
      Promise.resolve([
        Cupo.crear('1', TipoVehiculo.CARRO, 3),
        Cupo.crear('1', TipoVehiculo.MOTO, 5),
      ]),
  };
  const actualizarCupoFalso = {
    ejecutarVarios: (pedidos: { tipo: TipoVehiculo; maximo: number }[]) => {
      guardados.push(
        ...pedidos.map(({ tipo, maximo }) => ({ tipo: tipo.codigo, maximo })),
      );
      return Promise.resolve();
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [CuposController],
      providers: [
        { provide: EmisorTokens, useValue: emisorFalso },
        { provide: ConsultarCupos, useValue: consultarCuposFalso },
        { provide: ActualizarCupo, useValue: actualizarCupoFalso },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalFilters(new FiltroExcepciones());
    app.useGlobalPipes(crearPipeValidacion());
    await app.init();
  });

  beforeEach(() => {
    guardados = [];
  });

  afterAll(async () => {
    await app.close();
  });

  const servidor = () => app.getHttpServer();
  const comoAdmin = { Authorization: 'Bearer token-admin' };
  const comoOperador = { Authorization: 'Bearer token-operador' };

  describe('GET', () => {
    it('responde 200 con los cupos al administrador', async () => {
      const respuesta = await request(servidor())
        .get('/configuracion/cupos')
        .set(comoAdmin);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        cupos: [
          { tipoVehiculo: 'CARRO', maximo: 3 },
          { tipoVehiculo: 'MOTO', maximo: 5 },
        ],
      });
    });

    it('responde 403 al operador', async () => {
      const respuesta = await request(servidor())
        .get('/configuracion/cupos')
        .set(comoOperador);

      expect(respuesta.status).toBe(403);
      expect(respuesta.body).toEqual({
        codigo: 'FORBIDDEN',
        motivo: 'No tienes permiso para esta acción',
      });
    });

    it('responde 401 sin token', async () => {
      const respuesta = await request(servidor()).get('/configuracion/cupos');

      expect(respuesta.status).toBe(401);
    });
  });

  describe('PUT', () => {
    it('responde 200, guarda cada cupo y devuelve la lista al administrador', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({
          cupos: [
            { tipoVehiculo: 'CARRO', maximo: 10 },
            { tipoVehiculo: 'MOTO', maximo: 0 },
          ],
        });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.cupos).toHaveLength(2);
      expect(guardados).toEqual([
        { tipo: 'CARRO', maximo: 10 },
        { tipo: 'MOTO', maximo: 0 },
      ]);
    });

    it('responde 403 al operador y no guarda nada', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoOperador)
        .send({ cupos: [{ tipoVehiculo: 'CARRO', maximo: 10 }] });

      expect(respuesta.status).toBe(403);
      expect(guardados).toEqual([]);
    });

    it('responde 401 sin token', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .send({ cupos: [{ tipoVehiculo: 'CARRO', maximo: 10 }] });

      expect(respuesta.status).toBe(401);
      expect(guardados).toEqual([]);
    });

    it.each([
      ['un elemento nulo', null],
      ['una lista anidada', []],
      ['un elemento de texto', 'CARRO'],
      [
        'un máximo que excede INTEGER',
        { tipoVehiculo: 'CARRO', maximo: 2147483648 },
      ],
      [
        'campos extra dentro del cupo',
        { tipoVehiculo: 'CARRO', maximo: 3, extra: true },
      ],
      ['un máximo negativo', { tipoVehiculo: 'CARRO', maximo: -1 }],
      ['un máximo decimal', { tipoVehiculo: 'CARRO', maximo: 2.5 }],
      ['un máximo que no es número', { tipoVehiculo: 'CARRO', maximo: 'x' }],
      ['un cupo sin máximo', { tipoVehiculo: 'CARRO' }],
    ])('responde 400 con motivo ante %s', async (_caso, cupo) => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({ cupos: [cupo] });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.codigo).toBe('BAD_REQUEST');
      expect(respuesta.body.motivo).toEqual(expect.any(String));
      expect(guardados).toEqual([]);
    });

    it('responde 400 si el tipo de vehículo no existe', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({ cupos: [{ tipoVehiculo: 'BUS', maximo: 4 }] });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.motivo).toBe('Tipo de vehículo desconocido: BUS');
    });

    it('responde 400 si hay un tipo repetido y no guarda ninguno', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({
          cupos: [
            { tipoVehiculo: 'CARRO', maximo: 1 },
            { tipoVehiculo: 'CARRO', maximo: 2 },
          ],
        });

      expect(respuesta.status).toBe(400);
      expect(guardados).toEqual([]);
    });

    it('responde 400 si un tipo es válido y otro no, sin guardar el válido', async () => {
      const respuesta = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({
          cupos: [
            { tipoVehiculo: 'CARRO', maximo: 1 },
            { tipoVehiculo: 'BUS', maximo: 2 },
          ],
        });

      expect(respuesta.status).toBe(400);
      expect(guardados).toEqual([]);
    });

    it('responde 400 si la lista llega vacía o con campos de más', async () => {
      const vacia = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({ cupos: [] });
      const conExtra = await request(servidor())
        .put('/configuracion/cupos')
        .set(comoAdmin)
        .send({ cupos: [{ tipoVehiculo: 'CARRO', maximo: 1 }], otro: true });

      expect(vacia.status).toBe(400);
      expect(conExtra.status).toBe(400);
    });
  });
});

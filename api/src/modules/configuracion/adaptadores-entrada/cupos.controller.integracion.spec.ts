import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configurarHttp } from '../../../compartido/configurar-http';
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../../../compartido/base-datos/seeds/cupos.seed';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { EmisorJwt } from '../../acceso/infraestructura/emisor-jwt';
import { ConfiguracionModule } from '../configuracion.module';

describe('CARQ-62: cupos HTTP y PostgreSQL', () => {
  let db: DataSource;
  let app: INestApplication;
  let admin: string;
  let operador: string;
  const emisor = new EmisorJwt('clave-solo-para-pruebas-carq-62', '5m');
  const ruta = '/configuracion/cupos';
  const originales = {
    cupos: [
      { tipoVehiculo: 'CARRO', maximo: 3 },
      { tipoVehiculo: 'MOTO', maximo: 5 },
    ],
  };
  const servidor = () => request(app.getHttpServer() as Server);
  const consultar = () => servidor().get(ruta).set('Authorization', admin);
  const actualizar = (cuerpo: unknown) =>
    servidor()
      .put(ruta)
      .set('Authorization', admin)
      .send(cuerpo as object);

  @Global()
  @Module({
    providers: [{ provide: DataSource, useFactory: () => db }],
    exports: [DataSource],
  })
  class BaseDatosCuposPruebasModule {}

  async function iniciarApi() {
    const modulo = await Test.createTestingModule({
      imports: [BaseDatosCuposPruebasModule, ConfiguracionModule],
    })
      .overrideProvider(EmisorTokens)
      .useValue(emisor)
      .compile();
    const aplicacion = modulo.createNestApplication();
    configurarHttp(aplicacion, 'http://localhost:3000');
    await aplicacion.init();
    return aplicacion;
  }
  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    admin = `Bearer ${await emisor.emitir({ nombre: 'admin', rol: Rol.ADMINISTRADOR })}`;
    operador = `Bearer ${await emisor.emitir({ nombre: 'operador', rol: Rol.OPERADOR })}`;
    app = await iniciarApi();
  }, 30000);
  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarCupos(db);
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  it('consulta ambos tipos con los valores persistidos', async () => {
    await consultar().expect(200, originales);
  });
  it('guarda ambos tipos, admite cero y devuelve lo persistido', async () => {
    const cuerpo = {
      cupos: [
        { tipoVehiculo: 'CARRO', maximo: 0 },
        { tipoVehiculo: 'MOTO', maximo: 12 },
      ],
    };
    await actualizar(cuerpo).expect(200, cuerpo);
    await consultar().expect(200, cuerpo);
    const filas = await db.query('SELECT tipo, maximo FROM cupo ORDER BY tipo');
    expect(filas).toEqual([
      { tipo: 'CARRO', maximo: 0 },
      { tipo: 'MOTO', maximo: 12 },
    ]);
  });
  it('actualiza solo el tipo solicitado y conserva el omitido', async () => {
    await actualizar({ cupos: [{ tipoVehiculo: 'CARRO', maximo: 9 }] }).expect(
      200,
      {
        cupos: [
          { tipoVehiculo: 'CARRO', maximo: 9 },
          { tipoVehiculo: 'MOTO', maximo: 5 },
        ],
      },
    );
  });
  it('conserva los valores después de reiniciar la API', async () => {
    const cuerpo = {
      cupos: [
        { tipoVehiculo: 'CARRO', maximo: 8 },
        { tipoVehiculo: 'MOTO', maximo: 13 },
      ],
    };
    await actualizar(cuerpo).expect(200, cuerpo);
    await app.close();
    app = await iniciarApi();
    await consultar().expect(200, cuerpo);
  });
  it.each(['get', 'put'] as const)(
    'protege %s con JWT y rol, sin modificar datos',
    async (metodo) => {
      const vencido = await new EmisorJwt(
        'clave-solo-para-pruebas-carq-62',
        '-1s',
      ).emitir({ nombre: 'admin', rol: Rol.ADMINISTRADOR });
      for (const token of [
        undefined,
        'Bearer invalido',
        `Bearer ${vencido}`,
        operador,
      ]) {
        const solicitud = servidor()[metodo](ruta);
        if (token) solicitud.set('Authorization', token);
        const r = await solicitud.send({
          cupos: [{ tipoVehiculo: 'CARRO', maximo: 20 }],
        });
        expect(r.status).toBe(token === operador ? 403 : 401);
        expect(r.body).toEqual({
          codigo: token === operador ? 'FORBIDDEN' : 'UNAUTHORIZED',
          motivo: expect.any(String),
        });
      }
      await consultar().expect(200, originales);
    },
  );
  it.each([
    {},
    { cupos: [] },
    { cupos: [null] },
    { cupos: [[]] },
    { cupos: ['CARRO'] },
    { cupos: [{ tipoVehiculo: 'CARRO' }] },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: -1 }] },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: 1.5 }] },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: '3' }] },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: 2147483648 }] },
    { cupos: [{ tipoVehiculo: 'BUS', maximo: 1 }] },
    {
      cupos: [
        { tipoVehiculo: 'CARRO', maximo: 1 },
        { tipoVehiculo: 'CARRO', maximo: 2 },
      ],
    },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: 1, extra: true }] },
    { cupos: [{ tipoVehiculo: 'CARRO', maximo: 1 }], extra: true },
    {
      cupos: [
        { tipoVehiculo: 'CARRO', maximo: 20 },
        { tipoVehiculo: 'MOTO', maximo: -1 },
      ],
    },
  ])('rechaza %j y conserva ambos cupos', async (cuerpo) => {
    const r = await actualizar(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({
      codigo: 'BAD_REQUEST',
      motivo: expect.any(String),
    });
    await consultar().expect(200, originales);
  });
  it('revierte CARRO si falla el guardado posterior de MOTO', async () => {
    await db.query(
      'ALTER TABLE cupo ADD CONSTRAINT ck_cupo_carq62_prueba CHECK (maximo <> 999)',
    );
    try {
      const r = await actualizar({
        cupos: [
          { tipoVehiculo: 'CARRO', maximo: 20 },
          { tipoVehiculo: 'MOTO', maximo: 999 },
        ],
      });
      expect(r.status).toBe(500);
      expect(r.body).toEqual({
        codigo: 'ERROR_INTERNO',
        motivo: 'Error interno del servidor',
      });
      await consultar().expect(200, originales);
    } finally {
      await db.query('ALTER TABLE cupo DROP CONSTRAINT ck_cupo_carq62_prueba');
    }
  });
});

import { Global, type INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configurarHttp } from '../../../compartido/configurar-http';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { EmisorJwt } from '../../acceso/infraestructura/emisor-jwt';
import { ConsultaModule } from '../consulta.module';

describe('Consulta de eventos y cobros (HTTP y PostgreSQL)', () => {
  let db: DataSource;
  let app: INestApplication;
  let tokens: Record<Rol, string>;
  let openApi: ReturnType<typeof configurarHttp>;
  const emisor = new EmisorJwt('clave-solo-para-estas-pruebas', '5m');
  const servidor = () => request(app.getHttpServer() as Server);

  @Global()
  @Module({
    providers: [{ provide: DataSource, useFactory: () => db }],
    exports: [DataSource],
  })
  class BaseDatosPruebasModule {}

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    const modulo = await Test.createTestingModule({
      imports: [BaseDatosPruebasModule, ConsultaModule],
    })
      .overrideProvider(EmisorTokens)
      .useValue(emisor)
      .compile();
    app = modulo.createNestApplication();
    openApi = configurarHttp(app, 'http://localhost:3000');
    await app.init();
    tokens = {
      [Rol.ADMINISTRADOR]: `Bearer ${await emisor.emitir({ nombre: 'admin', rol: Rol.ADMINISTRADOR })}`,
      [Rol.OPERADOR]: `Bearer ${await emisor.emitir({ nombre: 'operador', rol: Rol.OPERADOR })}`,
    };

    await limpiarBaseDatosPruebas(db);
    await db.query(`
      INSERT INTO sede (nombre) VALUES ('Principal'), ('Secundaria');
      INSERT INTO carril (sede_id, nombre) VALUES (1, 'Entrada'), (2, 'Entrada');
      INSERT INTO evento (sede_id, carril_id, placa, sentido, resultado, motivo, origen, ocurrido_en)
      VALUES
        (1, 1, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Ingreso', 'SIMULADO', '2026-11-23T13:00Z'),
        (1, 1, 'ABC123', 'SALIDA', 'AUTORIZADO', 'Salida', 'MANUAL', '2026-11-23T14:00Z'),
        (1, 1, 'ABC123', 'SALIDA', 'RECHAZADO', 'Rechazo', 'MANUAL', '2026-11-23T15:00Z'),
        (2, 2, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Otra sede', 'SIMULADO', '2026-11-23T14:30Z');
      INSERT INTO cobro (sede_id, placa, tipo_vehiculo, dia_operativo, franja, tarifa_aplicada, estado)
      VALUES
        (1, 'ABC123', 'CARRO', '2026-11-22', 'DIURNA', 5000, 'PENDIENTE'),
        (1, 'ABC123', 'CARRO', '2026-11-23', 'DIURNA', 5000, 'PAGADO'),
        (2, 'ABC123', 'CARRO', '2026-11-23', 'DIURNA', 5000, 'PENDIENTE');
    `);
  }, 30000);

  afterAll(async () => {
    await app?.close();
    await db?.destroy();
  });

  it.each([Rol.ADMINISTRADOR, Rol.OPERADOR])(
    'permite consultar eventos y cobros con el rol %s',
    async (rol) => {
      for (const ruta of ['/consulta/eventos', '/consulta/cobros']) {
        await servidor()
          .get(ruta)
          .set('Authorization', tokens[rol])
          .expect(200);
      }
    },
  );

  it.each(['/consulta/eventos', '/consulta/cobros'])(
    'requiere un token válido en %s',
    async (ruta) => {
      await servidor().get(ruta).expect(401);
    },
  );

  it('combina filtros de eventos, limita por sede y conserva el orden al paginar', async () => {
    const consultar = (pagina: number) =>
      servidor()
        .get('/consulta/eventos')
        .set('Authorization', tokens[Rol.OPERADOR])
        .query({
          placa: 'abc123',
          desde: '2026-11-23T08:00:00-05:00',
          hasta: '2026-11-23T10:00:00-05:00',
          resultado: 'AUTORIZADO',
          tamanioPagina: 1,
          pagina,
        });
    await consultar(1).expect(200, {
      elementos: [
        {
          id: 2,
          carrilId: 1,
          placa: 'ABC123',
          sentido: 'SALIDA',
          resultado: 'AUTORIZADO',
          motivo: 'Salida',
          origen: 'MANUAL',
          ocurridoEn: '2026-11-23T14:00:00.000Z',
        },
      ],
      haySiguiente: true,
    });
    await consultar(2).expect(200, {
      elementos: [
        {
          id: 1,
          carrilId: 1,
          placa: 'ABC123',
          sentido: 'ENTRADA',
          resultado: 'AUTORIZADO',
          motivo: 'Ingreso',
          origen: 'SIMULADO',
          ocurridoEn: '2026-11-23T13:00:00.000Z',
        },
      ],
      haySiguiente: false,
    });
  });

  it('filtra cobros por placa, estado y día operativo inclusivo de la sede principal', async () => {
    await servidor()
      .get('/consulta/cobros')
      .set('Authorization', tokens[Rol.ADMINISTRADOR])
      .query({
        placa: 'abc123',
        desde: '2026-11-22',
        hasta: '2026-11-23',
        estado: 'PENDIENTE',
      })
      .expect(200, {
        elementos: [
          {
            id: 1,
            placa: 'ABC123',
            tipoVehiculo: 'CARRO',
            diaOperativo: '2026-11-22',
            franja: 'DIURNA',
            tarifaAplicada: 5000,
            estado: 'PENDIENTE',
          },
        ],
        haySiguiente: false,
      });
  });

  it.each([
    ['/consulta/eventos', { desde: '2026-02-30T08:00:00-05:00' }, 422],
    [
      '/consulta/eventos',
      { desde: '2026-11-23T15:00:00Z', hasta: '2026-11-23T15:00:00Z' },
      422,
    ],
    ['/consulta/cobros', { desde: '2026-11-24', hasta: '2026-11-23' }, 422],
    ['/consulta/cobros', { placa: 'CARRO' }, 422],
    ['/consulta/eventos', { resultado: 'PAGADO' }, 400],
    ['/consulta/cobros', { estado: 'RECHAZADO' }, 400],
    ['/consulta/cobros', { tamanioPagina: 101 }, 400],
    ['/consulta/eventos', { sedeId: 2 }, 400],
  ])('rechaza filtros inválidos en %s (%j)', async (ruta, filtros, estado) => {
    const respuesta = await servidor()
      .get(ruta)
      .set('Authorization', tokens[Rol.OPERADOR])
      .query(filtros)
      .expect(estado);
    expect(respuesta.body).toMatchObject({
      codigo: estado === 400 ? 'BAD_REQUEST' : 'FILTRO_CONSULTA_INVALIDO',
      motivo: expect.any(String),
    });
  });

  it.each([
    ['/consulta/eventos', 'resultado', 'PaginaEventosDto'],
    ['/consulta/cobros', 'estado', 'PaginaCobrosDto'],
  ])(
    'documenta %s, su paginación y la autorización en Swagger',
    (ruta, filtro, pagina) => {
      const operacion = openApi.paths[ruta]?.get;
      expect(operacion?.security).toEqual([{ sesion: [] }]);
      expect(operacion?.parameters).toEqual(
        expect.arrayContaining(
          ['placa', 'desde', 'hasta', 'pagina', 'tamanioPagina', filtro].map(
            (name) => expect.objectContaining({ name, in: 'query' }),
          ),
        ),
      );
      expect(operacion?.responses['200']).toMatchObject({
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${pagina}` },
          },
        },
      });
    },
  );
});

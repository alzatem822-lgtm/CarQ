import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { EmisorJwt } from '../../acceso/infraestructura/emisor-jwt';
import { ConfiguracionModule } from '../configuracion.module';

describe('Configuración de tarifas y franja (HTTP y PostgreSQL)', () => {
  let db: DataSource;
  let app: INestApplication;
  let admin: string;
  let operador: string;
  const emisor = new EmisorJwt('clave-solo-para-estas-pruebas', '5m');
  const rutaTarifas = '/configuracion/tarifas';
  const servidor = () => request(app.getHttpServer() as Server);
  const tarifasIniciales = [
    { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 5000 },
    { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 3000 },
    { tipoVehiculo: 'MOTO', franja: 'DIURNA', valor: 0 },
    { tipoVehiculo: 'MOTO', franja: 'NOCTURNA', valor: 0 },
  ];
  const consultar = () =>
    servidor().get(rutaTarifas).set('Authorization', admin);

  @Global()
  @Module({
    providers: [{ provide: DataSource, useFactory: () => db }],
    exports: [DataSource],
  })
  class BaseDatosPruebasModule {}

  async function iniciarApi() {
    const modulo = await Test.createTestingModule({
      imports: [BaseDatosPruebasModule, ConfiguracionModule],
    })
      .overrideProvider(EmisorTokens)
      .useValue(emisor)
      .compile();
    const aplicacion = modulo.createNestApplication();
    aplicacion.useGlobalPipes(crearPipeValidacion());
    aplicacion.useGlobalFilters(new FiltroExcepciones());
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
    await db.query('INSERT INTO sede (nombre) VALUES ($1)', ['Sede principal']);
    await sembrarTarifasYFranja(db);
  });

  afterAll(async () => {
    await app?.close();
    await db?.destroy();
  });

  it('devuelve el contrato del cliente con los datos de la sede principal', async () => {
    await db.query("INSERT INTO sede (nombre) VALUES ('Otra sede')");
    await db.query("INSERT INTO tarifa VALUES (2, 'CARRO', 'DIURNA', 9500)");
    await consultar().expect(200, {
      tarifas: tarifasIniciales,
      franja: { inicioHora: 6, finHora: 18 },
    });
  });

  it('rechaza la consulta sin un JWT válido y con el rol operador', async () => {
    await servidor().get(rutaTarifas).expect(401);
    await servidor()
      .get(rutaTarifas)
      .set('Authorization', 'Bearer invalido')
      .expect(401);
    await servidor()
      .get(rutaTarifas)
      .set('Authorization', operador)
      .expect(403);
  });

  it('devuelve un error genérico si la configuración de la sede no está disponible', async () => {
    await db.query('DELETE FROM franja');
    await consultar().expect(500, {
      codigo: 'ERROR_INTERNO',
      motivo: 'Error interno del servidor',
    });
  });
});

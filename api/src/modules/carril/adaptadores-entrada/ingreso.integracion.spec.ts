import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../../../compartido/base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../../../compartido/base-datos/seeds/umbral.seed';
import { LectorPlaca } from '../../vehiculos/aplicacion/lector-placa';
import { LectorManual } from '../../vehiculos/infraestructura/lector-manual';
import { Reloj } from '../../../compartido/reloj/reloj';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';

const SECRETO = 'carq-pruebas-ingreso-transaccional';
describe('Ingreso HTTP con transacciones PostgreSQL reales', () => {
  let db: DataSource;
  let app: INestApplication;
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const token = (rol = 'OPERADOR', expiresIn = 3600) =>
    jwt.sign({ sub: 'operador', rol }, SECRETO, { expiresIn });
  const ingresar = (placa = 'ABC123', confianza = 0.95) =>
    request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .send({ placa, confianza });
  const contar = async () => {
    const [fila]: { cobros: number; estancias: number; eventos: number }[] =
      await db.query(
        'SELECT (SELECT count(*)::int FROM cobro) cobros, (SELECT count(*)::int FROM estancia) estancias, (SELECT count(*)::int FROM evento) eventos',
      );
    return fila;
  };
  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      ZONA_HORARIA: 'America/Bogota',
      INICIO_DIA_OPERATIVO: '06:00',
      FUENTE_SENSOR: 'simulado',
      LECTOR_PLACAS: 'simulado',
      JWT_SECRETO: SECRETO,
      JWT_EXPIRACION: '1h',
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(Reloj)
      .useValue(new RelojFijo(new Date('2026-11-23T15:00:00Z')))
      .overrideProvider(BarreraCarril)
      .useValue(barrera)
      .compile();
    app = modulo.createNestApplication();
    configurarHttp(app, entorno.URL_WEB);
    await app.init();
  }, 30000);
  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarCupos(db);
    await sembrarTarifasYFranja(db);
    await sembrarUmbral(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
    await db.query('UPDATE parametro_sede SET umbral_confianza = 0.80');
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    jest.resetAllMocks();
    barrera.abrir.mockResolvedValue(undefined);
    barrera.denegar.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  it('CARQ-206: carro de día genera cobro pendiente con tarifa diurna y autoriza el ingreso', async () => {
    await ingresar().expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    expect(await contar()).toEqual({ cobros: 1, estancias: 1, eventos: 1 });
    const [cobro] = await db.query(
      'SELECT placa, tipo_vehiculo, dia_operativo::text, franja, tarifa_aplicada, estado FROM cobro',
    );
    expect(cobro).toEqual({
      placa: 'ABC123',
      tipo_vehiculo: 'CARRO',
      dia_operativo: '2026-11-23',
      franja: 'DIURNA',
      tarifa_aplicada: 5000,
      estado: 'PENDIENTE',
    });
    expect((await db.query('SELECT operador FROM evento'))[0].operador).toBe(
      'operador',
    );
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    expect(
      (await app.get(EstadoCarrilStore).obtener()).ultimaLectura,
    ).toMatchObject({ placa: 'ABC123', confianza: 0.95 });
  });
  it('registra la lectura manual con la identidad autenticada', async () => {
    const leer = jest
      .spyOn(app.get(LectorPlaca), 'leer')
      .mockImplementationOnce((solicitud) =>
        new LectorManual().leer(solicitud),
      );
    try {
      await ingresar('ABC123', 0.1).expect(200, {
        resultado: 'AUTORIZADO',
        motivo: 'Ingreso autorizado',
      });
      const [evento] = await db.query(
        'SELECT placa, origen, lectura_manual, operador FROM evento',
      );
      expect(evento).toEqual({
        placa: 'ABC123',
        origen: 'MANUAL',
        lectura_manual: true,
        operador: 'operador',
      });
    } finally {
      leer.mockRestore();
    }
  });
  it('no permite suplantar al operador enviándolo en el cuerpo', async () => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .send({ placa: 'ABC123', confianza: 1, operador: 'otra-persona' })
      .expect(400);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it('no crea cobro para tarifa cero', async () => {
    await ingresar('ABC12D').expect(200);
    expect(await contar()).toEqual({ cobros: 0, estancias: 1, eventos: 1 });
  });
  it('rechaza estancia duplicada sin segundo cobro ni apertura', async () => {
    await ingresar().expect(200);
    await ingresar().expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Ingreso ya registrado',
    });
    expect(await contar()).toEqual({ cobros: 1, estancias: 1, eventos: 2 });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
  it('reutiliza el cobro del mismo día después de cerrar la estancia', async () => {
    await ingresar().expect(200);
    await db.query(
      "UPDATE estancia SET salida_en = ingreso_en + interval '1 minute'",
    );
    await ingresar().expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    expect(await contar()).toEqual({ cobros: 1, estancias: 2, eventos: 2 });
  });
  it.each([
    { placa: 'invalida', confianza: 1 },
    { placa: 'ABC123', confianza: 0.79 },
    {},
  ])(
    'requiere lectura manual para %j sin admisión ni cobro',
    async (cuerpo) => {
      await request(app.getHttpServer())
        .post('/carril/ingreso')
        .auth(token(), { type: 'bearer' })
        .send(cuerpo)
        .expect(200, {
          resultado: 'REQUIERE_LECTURA_MANUAL',
          motivo: 'Se requiere validación manual',
        });
      expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 1 });
      expect(barrera.abrir).not.toHaveBeenCalled();
    },
  );
  it('registra LLENO sin estancia ni cobro y sin apertura', async () => {
    await db.query("UPDATE cupo SET maximo = 0 WHERE tipo = 'CARRO'");
    await ingresar().expect(200, { resultado: 'RECHAZADO', motivo: 'LLENO' });
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 1 });
    expect(barrera.abrir).not.toHaveBeenCalled();
  });
  it.each([
    { tipo: 'CARRO', primera: 'ABC123', segunda: 'DEF456', cobros: 1 },
    { tipo: 'MOTO', primera: 'ABC12D', segunda: 'DEF45G', cobros: 0 },
  ])(
    'CARQ-210: llena el cupo de $tipo por API y rechaza otro ingreso sin ordenar apertura',
    async ({ tipo, primera, segunda, cobros }) => {
      await db.query('UPDATE cupo SET maximo = 1 WHERE tipo = $1', [tipo]);
      await ingresar(primera).expect(200, {
        resultado: 'AUTORIZADO',
        motivo: 'Ingreso autorizado',
      });
      expect(barrera.abrir).toHaveBeenCalledTimes(1);
      const ocupacion = await request(app.getHttpServer())
        .get('/carril/ocupacion')
        .auth(token(), { type: 'bearer' })
        .expect(200);
      expect(ocupacion.body.cupos).toContainEqual({
        tipoVehiculo: tipo,
        ocupacion: 1,
        maximo: 1,
      });

      await ingresar(segunda).expect(200, {
        resultado: 'RECHAZADO',
        motivo: 'LLENO',
      });
      expect(barrera.abrir).toHaveBeenCalledTimes(1);
      expect(barrera.denegar).toHaveBeenCalledTimes(1);
      expect(barrera.denegar).toHaveBeenCalledWith('LLENO');
      expect(await contar()).toEqual({ cobros, estancias: 1, eventos: 2 });
      const estancias = await db.query(
        'SELECT placa FROM estancia WHERE salida_en IS NULL',
      );
      expect(estancias).toEqual([{ placa: primera }]);
      const [rechazo] = await db.query(
        'SELECT placa, sentido, resultado, motivo FROM evento WHERE placa = $1',
        [segunda],
      );
      expect(rechazo).toEqual({
        placa: segunda,
        sentido: 'ENTRADA',
        resultado: 'RECHAZADO',
        motivo: 'LLENO',
      });
      const estado = await request(app.getHttpServer())
        .get('/carril/estado')
        .auth(token(), { type: 'bearer' })
        .expect(200);
      expect(estado.body.ultimoResultado).toEqual({
        resultado: 'RECHAZADO',
        motivo: 'LLENO',
      });
      const posterior = await request(app.getHttpServer())
        .get('/carril/ocupacion')
        .auth(token(), { type: 'bearer' })
        .expect(200);
      expect(posterior.body.cupos).toEqual(ocupacion.body.cupos);
    },
  );
  it('protege el último cupo ante dos solicitudes concurrentes', async () => {
    await db.query("UPDATE cupo SET maximo = 1 WHERE tipo = 'CARRO'");
    const respuestas = await Promise.all([
      ingresar('ABC123'),
      ingresar('DEF456'),
    ]);
    expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
    expect(respuestas.map((r) => r.body.resultado).sort()).toEqual([
      'AUTORIZADO',
      'RECHAZADO',
    ]);
    expect(await contar()).toEqual({ cobros: 1, estancias: 1, eventos: 2 });
  });
  it('serializa ingresos concurrentes de la misma placa', async () => {
    const respuestas = await Promise.all([ingresar(), ingresar()]);
    expect(respuestas.map((r) => r.status)).toEqual([200, 200]);
    expect(respuestas.map((r) => r.body.motivo).sort()).toEqual([
      'Ingreso autorizado',
      'Ingreso ya registrado',
    ]);
    expect(await contar()).toEqual({ cobros: 1, estancias: 1, eventos: 2 });
  });
  it.each(['cobro', 'estancia', 'evento'])(
    'revierte toda la operación si falla insertar en %s',
    async (tabla) => {
      await db.query(
        "CREATE FUNCTION fallar_ingreso_prueba() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fallo controlado de ingreso'; END $$",
      );
      try {
        await db.query(
          `CREATE TRIGGER fallo_ingreso BEFORE INSERT ON ${tabla} FOR EACH ROW EXECUTE FUNCTION fallar_ingreso_prueba()`,
        );
        await ingresar().expect(500);
        expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
        expect(barrera.abrir).not.toHaveBeenCalled();
        expect(barrera.denegar).not.toHaveBeenCalled();
      } finally {
        await db.query(`DROP TRIGGER IF EXISTS fallo_ingreso ON ${tabla}`);
        await db.query('DROP FUNCTION fallar_ingreso_prueba()');
      }
    },
  );
  it('conserva la transacción cuando falla la barrera y no reintenta abrir', async () => {
    barrera.abrir.mockRejectedValueOnce(new Error('Barrera desconectada'));
    const respuesta = await ingresar().expect(422);
    expect(respuesta.body.codigo).toBe('BARRERA_NO_DISPONIBLE');
    expect(await contar()).toEqual({ cobros: 1, estancias: 1, eventos: 1 });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    await ingresar().expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Ingreso ya registrado',
    });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, 'invalido', token('OPERADOR', -1)])(
    'rechaza JWT ausente o inválido',
    async (credencial) => {
      const r = request(app.getHttpServer())
        .post('/carril/ingreso')
        .send({ placa: 'ABC123', confianza: 1 });
      if (credencial) r.auth(credencial, { type: 'bearer' });
      await r.expect(401);
      expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
    },
  );
  it('restringe el endpoint al operador', async () => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token('ADMINISTRADOR'), { type: 'bearer' })
      .send({ placa: 'ABC123', confianza: 1 })
      .expect(403);
  });
  it.each([
    { placa: 123 },
    { placa: null },
    { confianza: null },
    { confianza: 1.1 },
    { confianza: -1 },
    { confianza: 'no' },
    { sedeId: 99 },
    { imagen: 'no-es-un-archivo' },
  ])('valida cuerpo %j', async (cuerpo) => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .send(cuerpo)
      .expect(400);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it('delega imagen al lector simulado y solicita lectura manual', async () => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .attach('imagen', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'placa.jpg')
      .expect(200, {
        resultado: 'REQUIERE_LECTURA_MANUAL',
        motivo: 'Se requiere validación manual',
      });
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 1 });
  });
  it('no permite combinar imagen y placa', async () => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .field('placa', 'ABC123')
      .attach('imagen', Buffer.from('imagen'), 'placa.jpg')
      .expect(400);
  });
});

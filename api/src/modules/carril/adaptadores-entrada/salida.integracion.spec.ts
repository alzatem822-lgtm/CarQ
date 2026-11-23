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
import { Reloj } from '../../../compartido/reloj/reloj';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';

const SECRETO = 'carq-pruebas-salida-http';
describe('Salida HTTP con transacciones PostgreSQL reales', () => {
  let db: DataSource;
  let app: INestApplication;
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const token = (rol = 'OPERADOR', expiresIn = 3600) =>
    jwt.sign({ sub: 'operador', rol }, SECRETO, { expiresIn });
  const salir = (placa = 'ABC123', confianza = 0.95) =>
    request(app.getHttpServer())
      .post('/carril/salida')
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

  async function prepararIngreso(placa = 'ABC123') {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .send({ placa, confianza: 0.95 })
      .expect(200, { resultado: 'AUTORIZADO', motivo: 'Ingreso autorizado' });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    barrera.abrir.mockClear();
  }
  it('autoriza la salida pagada, cierra estancia y registra operador', async () => {
    await prepararIngreso();
    await db.query("UPDATE cobro SET estado = 'PAGADO'");
    await salir().expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    expect(await db.query('SELECT salida_en FROM estancia')).toEqual([
      { salida_en: new Date('2026-11-23T15:00:00Z') },
    ]);
    expect(
      await db.query(
        "SELECT operador, resultado FROM evento WHERE sentido = 'SALIDA'",
      ),
    ).toEqual([{ operador: 'operador', resultado: 'AUTORIZADO' }]);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
  it('CARQ-205: moto entra y sale sin cobro con ambas operaciones autorizadas', async () => {
    await prepararIngreso('ABC12D');
    // prepararIngreso verifica la respuesta por API y limpia la apertura inicial.
    await salir('ABC12D').expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Sin cobro exigible',
    });
    expect(await contar()).toEqual({ cobros: 0, estancias: 1, eventos: 2 });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    expect(
      await db.query('SELECT sentido, resultado FROM evento ORDER BY id'),
    ).toEqual([
      { sentido: 'ENTRADA', resultado: 'AUTORIZADO' },
      { sentido: 'SALIDA', resultado: 'AUTORIZADO' },
    ]);
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).not.toBeNull();
  });
  it('CARQ-207: salida con deuda devuelve el motivo y no ordena apertura ni cierra estancia', async () => {
    await prepararIngreso();
    await salir().expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    expect(await db.query('SELECT salida_en FROM estancia')).toEqual([
      { salida_en: null },
    ]);
    expect(barrera.abrir).not.toHaveBeenCalled();
    expect(barrera.denegar).toHaveBeenCalledWith(
      'Cobro pendiente, pasar por caja',
    );
  });
  it('CARQ-208: pago por Caja, salida y reingreso conservan un solo cobro y pago', async () => {
    await prepararIngreso();
    const consulta = await request(app.getHttpServer())
      .get('/cobros/pendientes')
      .auth(token(), { type: 'bearer' })
      .query({ placa: 'ABC123' })
      .expect(200);
    expect(consulta.body.cobros).toHaveLength(1);
    const original = consulta.body.cobros[0];
    expect(original).toMatchObject({
      placa: 'ABC123',
      estado: 'PENDIENTE',
      tarifaAplicada: 5000,
    });
    const pago = await request(app.getHttpServer())
      .post('/pagos/efectivo')
      .auth(token(), { type: 'bearer' })
      .send({ cobroId: original.id, referencia: 'carq-208-flujo-completo' })
      .expect(200);
    expect(pago.body).toMatchObject({
      cobro: { id: original.id, estado: 'PAGADO' },
      pago: { monto: 5000, operador: 'operador' },
    });
    await salir().expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Cobro pagado',
    });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
    expect(
      (
        await db.query(
          'SELECT count(*)::int total FROM estancia WHERE salida_en IS NULL',
        )
      )[0].total,
    ).toBe(0);
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .send({ placa: 'ABC123', confianza: 0.95 })
      .expect(200, { resultado: 'AUTORIZADO', motivo: 'Ingreso autorizado' });
    expect(barrera.abrir).toHaveBeenCalledTimes(2);
    expect(
      await db.query('SELECT id, estado, tarifa_aplicada FROM cobro'),
    ).toEqual([
      {
        id: original.id,
        estado: 'PAGADO',
        tarifa_aplicada: original.tarifaAplicada,
      },
    ]);
    expect(await db.query('SELECT cobro_id, referencia FROM pago')).toEqual([
      { cobro_id: original.id, referencia: 'carq-208-flujo-completo' },
    ]);
    expect(
      await db.query('SELECT salida_en FROM estancia ORDER BY id'),
    ).toEqual([
      { salida_en: new Date('2026-11-23T15:00:00Z') },
      { salida_en: null },
    ]);
    expect(
      await db.query('SELECT sentido, resultado FROM evento ORDER BY id'),
    ).toEqual([
      { sentido: 'ENTRADA', resultado: 'AUTORIZADO' },
      { sentido: 'SALIDA', resultado: 'AUTORIZADO' },
      { sentido: 'ENTRADA', resultado: 'AUTORIZADO' },
    ]);
  });

  it('rechaza salida sin ingreso', async () => {
    await salir().expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Sin ingreso registrado',
    });
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 1 });
  });
  it.each([undefined, 'invalido', token('OPERADOR', -1)])(
    'exige JWT válido',
    async (credencial) => {
      const r = request(app.getHttpServer())
        .post('/carril/salida')
        .send({ placa: 'ABC123', confianza: 1 });
      if (credencial) r.auth(credencial, { type: 'bearer' });
      await r.expect(401);
      expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
    },
  );
  it('rechaza rol administrador', async () => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token('ADMINISTRADOR'), { type: 'bearer' })
      .send({ placa: 'ABC123', confianza: 1 })
      .expect(403);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it.each([
    { placa: null },
    { placa: 123 },
    { confianza: null },
    { confianza: -1 },
    { confianza: 1.1 },
    { confianza: 'no' },
    { operador: 'otro' },
    { sedeId: 2 },
    { imagen: 'texto' },
  ])('rechaza cuerpo inválido %j', async (cuerpo) => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .send(cuerpo)
      .expect(400);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it.each([
    {},
    { placa: 'invalida', confianza: 1 },
    { placa: 'ABC123', confianza: 0.1 },
  ])('requiere validación manual para %j', async (cuerpo) => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .send(cuerpo)
      .expect(200, {
        resultado: 'REQUIERE_LECTURA_MANUAL',
        motivo: 'Se requiere validación manual',
      });
    expect(barrera.abrir).not.toHaveBeenCalled();
  });
  it('recibe imagen multipart y delega al lector simulado', async () => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .attach('imagen', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), 'placa.jpg')
      .expect(200, {
        resultado: 'REQUIERE_LECTURA_MANUAL',
        motivo: 'Se requiere validación manual',
      });
  });
  it('acepta placa y confianza en multipart', async () => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .field('placa', 'ABC123')
      .field('confianza', '0.95')
      .expect(200, {
        resultado: 'RECHAZADO',
        motivo: 'Sin ingreso registrado',
      });
  });
  it.each(['placa', 'confianza'])('no combina imagen con %s', async (campo) => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .field(campo, campo === 'placa' ? 'ABC123' : '0.95')
      .attach('imagen', Buffer.from('imagen'), 'placa.jpg')
      .expect(400);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it('limita el tamaño de la imagen a 5 MiB', async () => {
    await request(app.getHttpServer())
      .post('/carril/salida')
      .auth(token(), { type: 'bearer' })
      .attach('imagen', Buffer.alloc(5 * 1024 * 1024 + 1), 'placa.jpg')
      .expect(413);
    expect(await contar()).toEqual({ cobros: 0, estancias: 0, eventos: 0 });
  });
  it('expone en Swagger la ruta, formatos, JWT y resultado', async () => {
    const r = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(r.body.paths['/carril/salida'].post).toMatchObject({
      operationId: 'procesarSalida',
      security: [{ sesion: [] }],
      requestBody: {
        content: {
          'application/json': expect.any(Object),
          'multipart/form-data': expect.any(Object),
        },
      },
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SalidaRespuestaDto' },
            },
          },
        },
        '400': expect.any(Object),
        '401': expect.any(Object),
        '403': expect.any(Object),
        '422': expect.any(Object),
      },
    });
  });
});

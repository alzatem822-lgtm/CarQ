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
import { LectorPlaca } from '../../vehiculos/aplicacion/lector-placa';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';

const SECRETO = 'carq-pruebas-confirmacion-manual';
describe('Confirmación manual HTTP (CARQ-149)', () => {
  let db: DataSource;
  let app: INestApplication;
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const lectorCaptura = {
    leer: jest.fn().mockRejectedValue(new Error('OCR caído')),
  };
  const token = (rol = 'OPERADOR', expiresIn = 3600) =>
    jwt.sign({ sub: 'operador', rol }, SECRETO, { expiresIn });
  const enviar = (cuerpo: object) =>
    request(app.getHttpServer())
      .post('/carril/lectura-manual')
      .auth(token(), { type: 'bearer' })
      .send(cuerpo);
  const contar = async () => {
    const [fila]: { eventos: number; estancias: number; cobros: number }[] =
      await db.query(
        'SELECT (SELECT count(*)::int FROM evento) eventos, (SELECT count(*)::int FROM estancia) estancias, (SELECT count(*)::int FROM cobro) cobros',
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
      FUENTE_SENSOR: 'simulado',
      CONTROLADOR_BARRERA: 'simulado',
      LECTOR_PLACAS: 'simulado',
      ZONA_HORARIA: 'America/Bogota',
      INICIO_DIA_OPERATIVO: '06:00',
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
      .overrideProvider(LectorPlaca)
      .useValue(lectorCaptura)
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
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    jest.clearAllMocks();
    barrera.abrir.mockResolvedValue(undefined);
    barrera.denegar.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  it('continúa entrada y salida gratuitas y persiste ambos eventos con el operador del JWT', async () => {
    await db.query("UPDATE tarifa SET valor = 0 WHERE tipo_vehiculo = 'MOTO'");
    await enviar({ sentido: 'ENTRADA', placa: ' abc-12 a ' }).expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    await enviar({ sentido: 'SALIDA', placa: 'ABC12A' }).expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Sin cobro exigible',
    });
    const eventos = await db.query(
      'SELECT placa, sentido, origen, lectura_manual, operador FROM evento ORDER BY id',
    );
    expect(eventos).toEqual(
      ['ENTRADA', 'SALIDA'].map((sentido) => ({
        placa: 'ABC12A',
        sentido,
        origen: 'MANUAL',
        lectura_manual: true,
        operador: 'operador',
      })),
    );
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).not.toBeNull();
    expect((await contar()).cobros).toBe(0);
    expect(lectorCaptura.leer).not.toHaveBeenCalled();
    expect(barrera.abrir).toHaveBeenCalledTimes(2);
  });

  it('rechaza salida sin ingreso con 200 y registra el intento manual', async () => {
    await enviar({ sentido: 'SALIDA', placa: 'ABC123' }).expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Sin ingreso registrado',
    });
    expect(await contar()).toEqual({ eventos: 1, estancias: 0, cobros: 0 });
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it('conserva el rechazo por cobro pendiente sin cerrar la estancia ni abrir', async () => {
    await enviar({ sentido: 'ENTRADA', placa: 'ABC123' }).expect(200);
    barrera.abrir.mockClear();
    await enviar({ sentido: 'SALIDA', placa: 'ABC123' }).expect(200, {
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).toBeNull();
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it.each([
    {},
    { sentido: 'ENTRADA' },
    { placa: 'ABC123' },
    { sentido: 'OTRO', placa: 'ABC123' },
    { sentido: null, placa: 'ABC123' },
    { sentido: 'ENTRADA', placa: null },
    { sentido: 'ENTRADA', placa: 123 },
    { sentido: 'ENTRADA', placa: '' },
    { sentido: 'ENTRADA', placa: 'A'.repeat(33) },
    ...['operador', 'sedeId', 'carrilId', 'confianza', 'origen', 'imagen'].map(
      (campo) => ({ sentido: 'ENTRADA', placa: 'ABC123', [campo]: 'otro' }),
    ),
  ])('rechaza cuerpo inválido o con campos adicionales: %j', async (cuerpo) => {
    await enviar(cuerpo).expect(400);
    expect(await contar()).toEqual({ eventos: 0, estancias: 0, cobros: 0 });
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it.each(['XX', '   ', 'ABC1234'])(
    'rechaza formato de placa %s con 422 sin efectos',
    async (placa) => {
      const r = await enviar({ sentido: 'ENTRADA', placa }).expect(422);
      expect(r.body.codigo).toBe('PLACA_INVALIDA');
      expect(await contar()).toEqual({ eventos: 0, estancias: 0, cobros: 0 });
    },
  );

  it.each(['ausente', 'invalido', 'vencido', 'administrador'])(
    'impide acceso %s',
    async (caso) => {
      const req = request(app.getHttpServer()).post('/carril/lectura-manual');
      if (caso !== 'ausente')
        req.auth(
          caso === 'invalido'
            ? 'invalido'
            : token(
                caso === 'administrador' ? 'ADMINISTRADOR' : 'OPERADOR',
                caso === 'vencido' ? -1 : 3600,
              ),
          { type: 'bearer' },
        );
      await req
        .send({ sentido: 'ENTRADA', placa: 'ABC123' })
        .expect(caso === 'administrador' ? 403 : 401);
      expect(await contar()).toEqual({ eventos: 0, estancias: 0, cobros: 0 });
    },
  );

  it('expone el fallo de barrera posterior al commit y conserva los registros', async () => {
    barrera.abrir.mockRejectedValueOnce(new Error('Barrera sin conexión'));
    const r = await enviar({ sentido: 'ENTRADA', placa: 'ABC123' }).expect(422);
    expect(r.body.codigo).toBe('BARRERA_NO_DISPONIBLE');
    expect(await contar()).toEqual({ eventos: 1, estancias: 1, cobros: 1 });
  });

  it('documenta cuerpo, autorización, respuesta y errores en Swagger', async () => {
    const r = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(r.body.paths['/carril/lectura-manual'].post).toMatchObject({
      operationId: 'confirmarLecturaManual',
      security: [{ sesion: [] }],
      responses: {
        '200': expect.any(Object),
        '400': expect.any(Object),
        '401': expect.any(Object),
        '403': expect.any(Object),
        '422': expect.any(Object),
      },
    });
    expect(
      r.body.components.schemas.ConfirmarLecturaManualDto.required.sort(),
    ).toEqual(['placa', 'sentido']);
  });
});

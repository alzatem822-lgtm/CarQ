import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
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

const SECRETO = 'carq-pruebas-fallos-ocr';
describe('CARQ-90: fallos LPR no autorizan el carril', () => {
  let db: DataSource;
  let app: INestApplication;
  let lpr: Server;
  let fallo: 'http' | 'contrato' | 'sin-placa' | 'conexion';
  let llamadas: number;
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const token = () => jwt.sign({ sub: 'operador', rol: 'OPERADOR' }, SECRETO);
  const contar = async () => {
    const [fila]: { eventos: number; estancias: number; cobros: number }[] =
      await db.query(
        'SELECT (SELECT count(*)::int FROM evento) eventos, (SELECT count(*)::int FROM estancia) estancias, (SELECT count(*)::int FROM cobro) cobros',
      );
    return fila;
  };
  beforeAll(async () => {
    lpr = createServer(async (req, res) => {
      for await (const fragmento of req) void fragmento;
      llamadas++;
      if (fallo === 'conexion') {
        res.destroy();
        return;
      }
      res.writeHead(fallo === 'http' ? 503 : 200, {
        'Content-Type': 'application/json',
      });
      res.end(
        JSON.stringify(
          fallo === 'contrato'
            ? { placa: 'ABC123', confianza: 9 }
            : { placa: null, confianza: 0 },
        ),
      );
    });
    await new Promise<void>((resolver) => lpr.listen(0, '127.0.0.1', resolver));
    db = await iniciarBaseDatosPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      FUENTE_SENSOR: 'simulado',
      CONTROLADOR_BARRERA: 'simulado',
      LECTOR_PLACAS: 'http',
      URL_LPR: `http://127.0.0.1:${(lpr.address() as AddressInfo).port}`,
      ZONA_HORARIA: 'America/Bogota',
      INICIO_DIA_OPERATIVO: '06:00',
      JWT_SECRETO: SECRETO,
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
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    jest.clearAllMocks();
    llamadas = 0;
    fallo = 'http';
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
    lpr?.closeAllConnections();
    if (lpr?.listening)
      await new Promise<void>((resolver) => lpr.close(() => resolver()));
  });

  it.each([
    ['ENTRADA', 'ingreso', 'http'],
    ['SALIDA', 'salida', 'http'],
    ['ENTRADA', 'ingreso', 'contrato'],
    ['SALIDA', 'salida', 'contrato'],
    ['ENTRADA', 'ingreso', 'sin-placa'],
    ['SALIDA', 'salida', 'sin-placa'],
    ['ENTRADA', 'ingreso', 'conexion'],
    ['SALIDA', 'salida', 'conexion'],
  ] as const)(
    'solicita manual para %s ante fallo %s/%s sin efectos de admisión',
    async (sentido, ruta, caso) => {
      fallo = caso;
      await request(app.getHttpServer())
        .post(`/carril/${ruta}`)
        .auth(token(), { type: 'bearer' })
        .attach('imagen', Buffer.from('imagen-prueba'), 'foto.png')
        .expect(200, {
          resultado: 'REQUIERE_LECTURA_MANUAL',
          motivo: 'Se requiere validación manual',
        });
      expect(llamadas).toBe(1);
      expect(await contar()).toEqual({ eventos: 1, estancias: 0, cobros: 0 });
      expect(barrera.abrir).not.toHaveBeenCalled();
      expect(barrera.denegar).toHaveBeenCalledWith(
        'Se requiere validación manual',
      );
      expect(
        (
          await db.query(
            'SELECT origen, lectura_manual, placa, resultado FROM evento',
          )
        )[0],
      ).toEqual({
        origen: 'OCR',
        lectura_manual: false,
        placa: null,
        resultado: 'REQUIERE_LECTURA_MANUAL',
      });
      expect(await app.get(EstadoCarrilStore).obtener()).toMatchObject({
        sentido,
        requiereValidacionManual: true,
        ultimaLectura: null,
      });
    },
  );

  it('permite confirmar manualmente después del fallo sin volver a consultar LPR', async () => {
    await request(app.getHttpServer())
      .post('/carril/ingreso')
      .auth(token(), { type: 'bearer' })
      .attach('imagen', Buffer.from('imagen-prueba'), 'foto.png')
      .expect(200);
    await request(app.getHttpServer())
      .post('/carril/lectura-manual')
      .auth(token(), { type: 'bearer' })
      .send({ sentido: 'ENTRADA', placa: 'ABC123' })
      .expect(200, { resultado: 'AUTORIZADO', motivo: 'Ingreso autorizado' });
    expect(llamadas).toBe(1);
    expect(await contar()).toEqual({ eventos: 2, estancias: 1, cobros: 1 });
    expect(
      (
        await db.query(
          'SELECT origen, lectura_manual, operador FROM evento ORDER BY id',
        )
      )[1],
    ).toEqual({ origen: 'MANUAL', lectura_manual: true, operador: 'operador' });
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
});

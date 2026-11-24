import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'node:fs';
import { createServer, request as reenviar, type Server } from 'node:http';
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
import { BarreraCarril } from '../../carril/aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../../carril/aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../../carril/dominio/estado-carril';
import { LectorOcr } from './lector-ocr';

const SECRETO = 'carq-pruebas-lpr-real';
// Imágenes sintéticas: no contienen información de vehículos reales.
const placa = readFileSync(`${__dirname}/fixtures/placa-abc123.png`);
const vacia = readFileSync(`${__dirname}/fixtures/sin-placa.png`);

describe('CARQ-220: LectorOcr con servicio LPR real', () => {
  let app: INestApplication;
  let db: DataSource;
  let enlace: Server;
  let urlEnlace: string;
  const urlLpr = process.env.URL_LPR_PRUEBAS ?? 'http://127.0.0.1:8000';
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const token = () => jwt.sign({ sub: 'operador', rol: 'OPERADOR' }, SECRETO);
  const enviarImagen = (ruta: string, imagen: Buffer) =>
    request(app.getHttpServer())
      .post(`/carril/${ruta}`)
      .auth(token(), { type: 'bearer' })
      .attach('imagen', imagen, 'prueba.png');

  beforeAll(async () => {
    // Exige OCR real: una caída o respuesta sin detección no puede dar un falso positivo.
    const control = new LectorOcr(urlLpr, 30000);
    const inicial = await control.leer({ imagen: placa });
    expect(inicial.placa?.valor).toBe('ABC123');
    expect(inicial.confianza).toBeGreaterThan(0.8);
    // Pasarela transparente: solo transporta bytes al LPR real. Se cierra para probar su caída.
    enlace = createServer((req, res) => {
      const salida = reenviar(
        new URL('/read', urlLpr),
        {
          method: req.method,
          headers: { ...req.headers, host: new URL(urlLpr).host },
        },
        (respuesta) => {
          res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
          respuesta.pipe(res);
        },
      );
      salida.on('error', () => res.destroy());
      req.on('aborted', () => salida.destroy());
      req.pipe(salida);
    });
    await new Promise<void>((resolver) =>
      enlace.listen(0, '127.0.0.1', resolver),
    );
    urlEnlace = `http://127.0.0.1:${(enlace.address() as AddressInfo).port}`;
    db = await iniciarBaseDatosPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      LECTOR_PLACAS: 'http',
      URL_LPR: urlEnlace,
      FUENTE_SENSOR: 'simulado',
      CONTROLADOR_BARRERA: 'simulado',
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
  }, 60000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarCupos(db);
    await sembrarTarifasYFranja(db);
    await sembrarUmbral(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
    await db.query('UPDATE parametro_sede SET umbral_confianza = 0.8');
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
    enlace?.closeAllConnections();
    if (enlace?.listening)
      await new Promise<void>((resolver) => enlace.close(() => resolver()));
  });

  it('reconoce ABC123, autoriza el ingreso y persiste confianza y origen OCR', async () => {
    await enviarImagen('ingreso', placa).expect(200, {
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    const [evento] = await db.query(
      'SELECT placa, origen, confianza::float8 AS confianza, lectura_manual, resultado FROM evento',
    );
    expect(evento).toMatchObject({
      placa: 'ABC123',
      origen: 'OCR',
      lectura_manual: false,
      resultado: 'AUTORIZADO',
    });
    expect(evento.confianza).toBeGreaterThan(0.8);
    expect(evento.confianza).toBeLessThanOrEqual(1);
    expect(
      await db.query('SELECT placa FROM estancia WHERE salida_en IS NULL'),
    ).toEqual([{ placa: 'ABC123' }]);
    expect(await db.query('SELECT placa, estado FROM cobro')).toEqual([
      { placa: 'ABC123', estado: 'PENDIENTE' },
    ]);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });

  it.each(['ingreso', 'salida'])(
    'imagen sin placa deriva %s a validación manual sin efectos de admisión',
    async (ruta) => {
      await enviarImagen(ruta, vacia).expect(200, {
        resultado: 'REQUIERE_LECTURA_MANUAL',
        motivo: 'Se requiere validación manual',
      });
      expect(await db.query('SELECT id FROM estancia')).toHaveLength(0);
      expect(await db.query('SELECT id FROM cobro')).toHaveLength(0);
      expect(
        await db.query('SELECT placa, origen, resultado FROM evento'),
      ).toEqual([
        { placa: null, origen: 'OCR', resultado: 'REQUIERE_LECTURA_MANUAL' },
      ]);
      expect(barrera.abrir).not.toHaveBeenCalled();
      expect(
        (await app.get(EstadoCarrilStore).obtener()).requiereValidacionManual,
      ).toBe(true);
    },
  );

  it('la pérdida real de conexión solicita manual y permite confirmar sin tocar el LPR compartido', async () => {
    enlace.closeAllConnections();
    await new Promise<void>((resolver) => enlace.close(() => resolver()));
    await enviarImagen('ingreso', placa).expect(200, {
      resultado: 'REQUIERE_LECTURA_MANUAL',
      motivo: 'Se requiere validación manual',
    });
    expect(await db.query('SELECT id FROM estancia')).toHaveLength(0);
    expect(await db.query('SELECT id FROM cobro')).toHaveLength(0);
    expect(barrera.abrir).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .post('/carril/lectura-manual')
      .auth(token(), { type: 'bearer' })
      .send({ sentido: 'ENTRADA', placa: 'ABC123' })
      .expect(200, { resultado: 'AUTORIZADO', motivo: 'Ingreso autorizado' });
    expect(
      await db.query(
        'SELECT origen, resultado, lectura_manual FROM evento ORDER BY id',
      ),
    ).toEqual([
      {
        origen: 'OCR',
        resultado: 'REQUIERE_LECTURA_MANUAL',
        lectura_manual: false,
      },
      { origen: 'MANUAL', resultado: 'AUTORIZADO', lectura_manual: true },
    ]);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
});

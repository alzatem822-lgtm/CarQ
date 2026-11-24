import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createServer, type AddressInfo } from 'node:net';
import { once } from 'node:events';
import type { MqttClient } from 'mqtt';
import type { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { configurarHttp } from '../../../compartido/configurar-http';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { validarEntorno } from '../../../compartido/configuracion/validar-entorno';
import { CLIENTE_MQTT } from '../../../compartido/mqtt/modulo-mqtt';
import { iniciarBaseDatosPruebas } from '../../../compartido/pruebas/base-datos-pruebas';
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { iniciarRedisPruebas } from '../../../compartido/pruebas/redis-pruebas';
import { CLIENTE_REDIS } from '../../../compartido/redis/modulo-redis';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { SensorMqtt } from './sensor-mqtt';
import { BarreraMqtt } from './barrera-mqtt';

const SECRETO = 'secreto-pruebas-mqtt-no-disponible';

describe('CARQ-189: API disponible sin broker MQTT', () => {
  let app: INestApplication;
  let db: DataSource;
  let redis: Redis;
  let cliente: MqttClient;
  const token = jwt.sign({ sub: 'operador', rol: 'OPERADOR' }, SECRETO);
  const consultar = (ruta: string) =>
    request(app.getHttpServer())
      .get(ruta)
      .auth(token, { type: 'bearer' })
      .timeout({ response: 1000, deadline: 2000 });

  beforeAll(async () => {
    // Obtiene un puerto local libre y lo cierra: no toca el Mosquitto del usuario.
    const reserva = createServer();
    reserva.listen(0, '127.0.0.1');
    await once(reserva, 'listening');
    const puerto = (reserva.address() as AddressInfo).port;
    await new Promise<void>((resolver) => reserva.close(() => resolver()));
    db = await iniciarBaseDatosPruebas();
    await sembrarSedeYCarril(db);
    redis = await iniciarRedisPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      FUENTE_SENSOR: 'mqtt',
      CONTROLADOR_BARRERA: 'mqtt',
      LECTOR_PLACAS: 'simulado',
      URL_MQTT: `mqtt://127.0.0.1:${puerto}`,
      JWT_SECRETO: SECRETO,
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(CLIENTE_REDIS)
      .useValue(redis)
      .compile();
    cliente = modulo.get<MqttClient>(CLIENTE_MQTT);
    const falloReal = new Promise<void>((resolver) =>
      cliente.once('error', () => resolver()),
    );
    app = modulo.createNestApplication();
    configurarHttp(app, entorno.URL_WEB);
    await app.init();
    await falloReal;
  }, 30000);

  afterAll(async () => {
    await app?.close();
    redis?.disconnect();
    if (db?.isInitialized) await db.destroy();
  });

  it('inicia con el cliente y los adaptadores reales y sigue atendiendo sesiones y sondeo', async () => {
    expect(cliente.connected).toBe(false);
    expect(app.get(SensorPresencia)).toBeInstanceOf(SensorMqtt);
    expect(app.get(BarreraCarril)).toBeInstanceOf(BarreraMqtt);
    await consultar('/auth/sesion').expect(200, { rol: 'OPERADOR' });
    const respuesta = await consultar('/carril/estado').expect(200);
    expect(respuesta.body).toMatchObject({
      vehiculoPresente: false,
      barrera: { estado: 'CERRADA', motivo: null },
      simulacionHabilitada: false,
    });
  });

  it('rechaza la orden de barrera sin bloquear las siguientes consultas HTTP', async () => {
    await expect(
      app.get(BarreraCarril).abrir('Ingreso autorizado'),
    ).rejects.toMatchObject({ codigo: 'BARRERA_NO_DISPONIBLE' });
    await consultar('/carril/estado').expect(200);
    await consultar('/auth/sesion').expect(200);
    expect(cliente.connected).toBe(false);
  });
});

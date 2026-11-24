import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  connect,
  type MqttClient,
  type Packet,
  type IPublishPacket,
} from 'mqtt';
import type { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../../app.module';
import { configurarHttp } from '../../../compartido/configurar-http';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { validarEntorno } from '../../../compartido/configuracion/validar-entorno';
import { CLIENTE_MQTT } from '../../../compartido/mqtt/modulo-mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { iniciarRedisPruebas } from '../../../compartido/pruebas/redis-pruebas';
import { esperarEventoMqtt } from '../../../compartido/pruebas/esperar-evento-mqtt';
import { CLIENTE_REDIS } from '../../../compartido/redis/modulo-redis';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { EstadoCarril, estadoCarrilInicial } from '../dominio/estado-carril';
import { SensorMqtt } from './sensor-mqtt';
import { BarreraMqtt } from './barrera-mqtt';

// Identidad exclusiva de esta fixture, resuelta por las fábricas desde PostgreSQL.
const ID = 2147483219;
const TOPICOS = construirTopicosCarril(ID, ID);
const SECRETO = 'secreto-ficticio-carq-219';
const ESPERA_MS = 8000;

function esperarSuscripciones(cliente: MqttClient): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const faltantes = new Set([TOPICOS.sensor, TOPICOS.estadoBarrera]);
    const peticiones = new Map<number, string[]>();
    const terminar = (error?: Error) => {
      clearTimeout(temporizador);
      cliente.removeListener('packetsend', alEnviar);
      cliente.removeListener('packetreceive', alRecibir);
      cliente.removeListener('error', alFallar);
      if (error) rechazar(error);
      else resolver();
    };
    const alEnviar = (paquete: Packet) => {
      if (paquete.cmd === 'subscribe' && paquete.messageId !== undefined)
        peticiones.set(
          paquete.messageId,
          paquete.subscriptions.map((s) => s.topic),
        );
    };
    const alRecibir = (paquete: Packet) => {
      if (paquete.cmd !== 'suback' || paquete.messageId === undefined) return;
      const topicos = peticiones.get(paquete.messageId);
      if (!topicos) return;
      if (paquete.granted.some((qos) => typeof qos !== 'number' || qos > 2)) {
        terminar(new Error('Mosquitto rechazó una suscripción de pruebas'));
        return;
      }
      for (const topico of topicos) faltantes.delete(topico);
      peticiones.delete(paquete.messageId);
      if (faltantes.size === 0) terminar();
    };
    const alFallar = () =>
      terminar(new Error('Mosquitto de pruebas no disponible'));
    const temporizador = setTimeout(
      () => terminar(new Error('No se confirmaron las suscripciones MQTT')),
      ESPERA_MS,
    );
    cliente.on('packetsend', alEnviar);
    cliente.on('packetreceive', alRecibir);
    cliente.on('error', alFallar);
  });
}

async function recibirDurante(
  cliente: MqttClient,
  topico: string,
  accion: () => Promise<unknown>,
): Promise<{ payload: Buffer; paquete: IPublishPacket }> {
  let temporizador: ReturnType<typeof setTimeout>;
  let recibir!: (
    ruta: string,
    payload: Buffer,
    paquete: IPublishPacket,
  ) => void;
  const recibido = new Promise<{ payload: Buffer; paquete: IPublishPacket }>(
    (resolver, rechazar) => {
      recibir = (ruta, payload, paquete) => {
        if (ruta === topico) resolver({ payload, paquete });
      };
      cliente.on('message', recibir);
      temporizador = setTimeout(
        () => rechazar(new Error('No se recibió el mensaje MQTT esperado')),
        ESPERA_MS,
      );
    },
  );
  try {
    const [mensaje] = await Promise.all([recibido, accion()]);
    return mensaje;
  } finally {
    clearTimeout(temporizador!);
    cliente.removeListener('message', recibir);
  }
}

describe('CARQ-219: adaptadores y API contra Mosquitto real', () => {
  let app: INestApplication;
  let db: DataSource;
  let redis: Redis;
  let clienteApi: MqttClient;
  let dispositivo: MqttClient;
  let store: EstadoCarrilStore;
  let barrera: BarreraMqtt;
  const token = jwt.sign({ sub: 'operador', rol: 'OPERADOR' }, SECRETO);
  const publicar = (topico: string, payload: string) =>
    dispositivo.publishAsync(topico, payload, { qos: 1, retain: false });
  const consultar = async (): Promise<EstadoCarril> => {
    const respuesta = await request(app.getHttpServer())
      .get('/carril/estado')
      .auth(token, { type: 'bearer' })
      .timeout({ response: 2000, deadline: 3000 })
      .expect(200);
    return respuesta.body as EstadoCarril;
  };
  const esperarEstado = async (aceptar: (estado: EstadoCarril) => boolean) => {
    const limite = Date.now() + ESPERA_MS;
    do {
      const estado = await consultar();
      if (aceptar(estado)) return estado;
      await new Promise((resolver) => setTimeout(resolver, 20));
    } while (Date.now() < limite);
    throw new Error('El sondeo no reflejó el mensaje MQTT');
  };

  beforeAll(async () => {
    const urlMqtt = process.env.URL_MQTT_PRUEBAS ?? 'mqtt://127.0.0.1:1884';
    if (urlMqtt === process.env.URL_MQTT)
      throw new Error('URL_MQTT_PRUEBAS debe usar el broker de pruebas');
    db = await iniciarBaseDatosPruebas();
    await limpiarBaseDatosPruebas(db);
    await db.query(
      "INSERT INTO sede (id, nombre) VALUES ($1, 'Sede principal')",
      [ID],
    );
    await db.query(
      "INSERT INTO carril (id, sede_id, nombre) VALUES ($1, $1, 'Carril MQTT de pruebas')",
      [ID],
    );
    redis = await iniciarRedisPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      LECTOR_PLACAS: 'simulado',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      FUENTE_SENSOR: 'mqtt',
      CONTROLADOR_BARRERA: 'mqtt',
      URL_MQTT: urlMqtt,
      JWT_SECRETO: SECRETO,
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(CLIENTE_REDIS)
      .useValue(redis)
      .compile();
    app = modulo.createNestApplication();
    configurarHttp(app, entorno.URL_WEB);
    clienteApi = app.get<MqttClient>(CLIENTE_MQTT);
    store = app.get(EstadoCarrilStore);
    barrera = app.get<BarreraMqtt>(BarreraCarril);
    expect(app.get(SensorPresencia)).toBeInstanceOf(SensorMqtt);
    expect(barrera).toBeInstanceOf(BarreraMqtt);
    await Promise.all([esperarSuscripciones(clienteApi), app.init()]);

    // Segundo cliente: representa el dispositivo y observa los comandos del API.
    dispositivo = connect(urlMqtt, {
      manualConnect: true,
      reconnectPeriod: 0,
      connectTimeout: 3000,
    });
    dispositivo.on('error', () => undefined);
    const conectado = esperarEventoMqtt(dispositivo, 'connect');
    dispositivo.connect();
    await conectado;
    await dispositivo.subscribeAsync(TOPICOS.comandoBarrera, { qos: 0 });
  }, 30000);

  beforeEach(async () => {
    await store.guardar(estadoCarrilInicial());
  });
  afterAll(async () => {
    if (dispositivo?.stream) await dispositivo.endAsync(true);
    await app?.close();
    redis?.disconnect();
    if (db?.isInitialized) {
      await limpiarBaseDatosPruebas(db);
      await db.destroy();
    }
  });

  it('la presencia publicada por otro cliente actualiza el sondeo HTTP', async () => {
    await publicar(TOPICOS.sensor, '{"presencia":true}');
    await esperarEstado((e) => e.vehiculoPresente);
    await publicar(TOPICOS.sensor, '{"presencia":false}');
    const estado = await esperarEstado((e) => !e.vehiculoPresente);
    expect(estado.barrera.estado).toBe('CERRADA');
  }, 15000);

  it.each(['abrir', 'denegar', 'cerrar'] as const)(
    '%s llega al dispositivo con el contrato y tópico correctos',
    async (comando) => {
      const recibido = await recibirDurante(
        dispositivo,
        TOPICOS.comandoBarrera,
        () => barrera[comando]('Motivo local de pruebas'),
      );
      expect(JSON.parse(recibido.payload.toString())).toEqual({ comando });
      expect(recibido.paquete.qos).toBe(0);
      const estado = await consultar();
      expect(estado.barrera).toEqual({
        estado: 'CERRADA',
        motivo: 'Motivo local de pruebas',
      });
    },
    15000,
  );

  it('el estado físico recibido cambia el indicador conservando el motivo', async () => {
    await barrera.abrir('Ingreso autorizado');
    await publicar(TOPICOS.estadoBarrera, '{"estado":"abierta"}');
    const abierta = await esperarEstado((e) => e.barrera.estado === 'ABIERTA');
    expect(abierta.barrera.motivo).toBe('Ingreso autorizado');
    await publicar(TOPICOS.estadoBarrera, '{"estado":"cerrada"}');
    await esperarEstado((e) => e.barrera.estado === 'CERRADA');
  }, 15000);

  it('los mensajes inválidos recibidos del broker no alteran el estado', async () => {
    for (const [topico, payload] of [
      [TOPICOS.sensor, '{"presencia":"false"}'],
      [TOPICOS.estadoBarrera, '{"estado":"abriendo"}'],
    ]) {
      await recibirDurante(clienteApi, topico, () => publicar(topico, payload));
      expect(await consultar()).toMatchObject(estadoCarrilInicial());
    }
  }, 15000);

  it('restaura ambas suscripciones tras perder la conexión y mantiene el HTTP disponible', async () => {
    const original = clienteApi;
    const cerrado = esperarEventoMqtt(clienteApi, 'close');
    const suscrito = esperarSuscripciones(clienteApi);
    clienteApi.stream.destroy();
    await cerrado;
    await expect(barrera.abrir('No debe reenviarse')).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    expect(await consultar()).toMatchObject(estadoCarrilInicial());
    await suscrito;
    expect(app.get(CLIENTE_MQTT)).toBe(original);
    await Promise.all([
      publicar(TOPICOS.sensor, '{"presencia":true}'),
      publicar(TOPICOS.estadoBarrera, '{"estado":"abierta"}'),
    ]);
    await esperarEstado(
      (e) => e.vehiculoPresente && e.barrera.estado === 'ABIERTA',
    );
  }, 15000);
});

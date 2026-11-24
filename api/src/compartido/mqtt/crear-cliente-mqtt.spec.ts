import { once } from 'node:events';
import { createServer, type Server, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import type { MqttClient } from 'mqtt';
import { crearClienteMqtt } from './crear-cliente-mqtt';
import { esperarEventoMqtt } from '../pruebas/esperar-evento-mqtt';

describe('crearClienteMqtt (CARQ-183)', () => {
  let cliente: MqttClient | undefined;
  let servidor: Server | undefined;
  const sockets = new Set<Socket>();

  afterEach(async () => {
    if (cliente?.stream) await cliente.endAsync(true);
    cliente = undefined;
    for (const socket of sockets) socket.destroy();
    sockets.clear();
    if (servidor?.listening)
      await new Promise<void>((resolver) => servidor!.close(() => resolver()));
    servidor = undefined;
  });

  it('se crea sin conectar y configura reconexión sin encolar comandos QoS 0', () => {
    cliente = crearClienteMqtt('mqtt://127.0.0.1:1', jest.fn());
    expect(cliente.connected).toBe(false);
    expect(cliente.stream).toBeUndefined();
    expect(cliente.options).toMatchObject({
      manualConnect: true,
      reconnectPeriod: 1000,
      reconnectOnConnackError: true,
      connectTimeout: 5000,
      clean: true,
      resubscribe: true,
      queueQoSZero: false,
    });
  });

  it.each(['sin-url', 'http://broker:1883', 'mqtt://', 'ws://broker'])(
    'rechaza la configuración inválida %s',
    (url) => {
      expect(() => crearClienteMqtt(url, jest.fn())).toThrow(
        'URL_MQTT debe ser una URL válida MQTT o MQTTS',
      );
    },
  );

  it('acepta MQTTS sin desactivar la validación de certificados', () => {
    cliente = crearClienteMqtt('mqtts://broker:8883', jest.fn());
    expect(cliente.options.rejectUnauthorized).not.toBe(false);
  });

  it('reporta cambios una sola vez sin propagar detalles sensibles del error', () => {
    const registrar = jest.fn();
    cliente = crearClienteMqtt('mqtt://usuario:clave@127.0.0.1:1', registrar);
    cliente.emit('error', new Error('mqtt://usuario:clave@broker secreto'));
    cliente.emit('offline');
    cliente.emit('connect', {
      cmd: 'connack',
      returnCode: 0,
      sessionPresent: false,
    });
    cliente.emit('offline');
    expect(registrar.mock.calls).toEqual([
      ['desconectado'],
      ['conectado'],
      ['desconectado'],
    ]);
  });

  it('conecta, reintenta tras una caída y se reconecta sin recrear el cliente', async () => {
    // Doble TCP mínimo: reconoce CONNECT con CONNACK; no reemplaza Mosquitto.
    servidor = createServer((socket) => {
      sockets.add(socket);
      socket.on('error', () => undefined);
      socket.on('close', () => sockets.delete(socket));
      socket.once('data', () => socket.write(Buffer.from([0x20, 0x02, 0, 0])));
    });
    servidor.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const puerto = (servidor.address() as AddressInfo).port;
    const registrar = jest.fn();
    cliente = crearClienteMqtt(`mqtt://127.0.0.1:${puerto}`, registrar);
    const conectado = esperarEventoMqtt(cliente, 'connect');
    cliente.connect();
    await conectado;
    expect(cliente.connected).toBe(true);

    const cerrado = esperarEventoMqtt(cliente, 'close');
    const servidorCerrado = new Promise<void>((resolver) =>
      servidor!.close(() => resolver()),
    );
    for (const socket of sockets) socket.destroy();
    await Promise.all([cerrado, servidorCerrado]);
    expect(cliente.connected).toBe(false);
    // Se observa un intento fallido real, no solo un evento emitido por la prueba.
    await new Promise<void>((resolver) =>
      cliente!.once('error', () => resolver()),
    );
    const reconectado = esperarEventoMqtt(cliente, 'connect');
    servidor.listen(puerto, '127.0.0.1');
    await once(servidor, 'listening');
    await reconectado;
    expect(cliente.connected).toBe(true);
    expect(registrar.mock.calls).toEqual([
      ['conectado'],
      ['desconectado'],
      ['conectado'],
    ]);
  }, 10000);
});

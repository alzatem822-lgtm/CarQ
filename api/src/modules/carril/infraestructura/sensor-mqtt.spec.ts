import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { MqttClient, ClientSubscribeCallback } from 'mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { SensorMqtt } from './sensor-mqtt';

describe('Sensor de presencia MQTT (CARQ-186)', () => {
  let cliente: EventEmitter & {
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
  };
  let estado: EstadoCarrilEnMemoriaStore;
  let sensor: SensorMqtt;
  const topico = construirTopicosCarril(7, 12).sensor;
  const procesar = () =>
    new Promise<void>((resolver) => setImmediate(resolver));

  beforeEach(() => {
    cliente = Object.assign(new EventEmitter(), {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    });
    estado = new EstadoCarrilEnMemoriaStore();
    sensor = new SensorMqtt(cliente as unknown as MqttClient, estado, 7, 12);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await sensor.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('suscribe una sola vez el tópico exacto sin esperar al broker', () => {
    sensor.onModuleInit();
    sensor.onModuleInit();
    expect(cliente.subscribe).toHaveBeenCalledTimes(1);
    expect(cliente.subscribe).toHaveBeenCalledWith(
      topico,
      { qos: 0 },
      expect.any(Function),
    );
    expect(cliente.listenerCount('message')).toBe(1);
  });

  it.each([true, false])(
    'un mensaje presencia=%s conserva lectura, resultado y barrera',
    async (presencia) => {
      const anterior = {
        ...estadoCarrilInicial(),
        vehiculoPresente: !presencia,
        sentido: 'SALIDA' as const,
        ultimaLectura: {
          placa: 'ABC123',
          confianza: 0.7,
          origen: 'OCR' as const,
        },
        ultimoResultado: {
          resultado: 'RECHAZADO' as const,
          motivo: 'Cobro pendiente',
        },
        barrera: { estado: 'CERRADA' as const, motivo: 'Cobro pendiente' },
        requiereValidacionManual: true,
      };
      await estado.guardar(anterior);
      sensor.onModuleInit();
      cliente.emit(
        'message',
        topico,
        Buffer.from(JSON.stringify({ presencia })),
      );
      await procesar();
      expect(await estado.obtener()).toEqual({
        ...anterior,
        vehiculoPresente: presencia,
      });
      expect(anterior.vehiculoPresente).toBe(!presencia);
    },
  );

  it('ignora los mensajes de otra sede, otro carril o la barrera', async () => {
    const guardar = jest.spyOn(estado, 'guardar');
    sensor.onModuleInit();
    for (const ajeno of [
      construirTopicosCarril(8, 12).sensor,
      construirTopicosCarril(7, 13).sensor,
      construirTopicosCarril(7, 12).estadoBarrera,
    ])
      cliente.emit('message', ajeno, Buffer.from('{"presencia":true}'));
    await procesar();
    expect(guardar).not.toHaveBeenCalled();
  });

  it.each([
    '{',
    '{"presencia":"false"}',
    '{"presencia":true,"token":"secreto"}',
  ])(
    'descarta el payload inválido %s sin alterar el estado ni reflejarlo en logs',
    async (payload) => {
      sensor.onModuleInit();
      const guardar = jest.spyOn(estado, 'guardar');
      cliente.emit('message', topico, Buffer.from(payload));
      await procesar();
      expect(guardar).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Mensaje de presencia MQTT inválido descartado',
      );
    },
  );

  it('procesa señales consecutivas en orden aunque el almacenamiento sea asíncrono', async () => {
    let liberar!: () => void;
    const espera = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    const guardar = jest
      .spyOn(estado, 'guardar')
      .mockImplementationOnce(async (nuevo) => {
        await espera;
        await EstadoCarrilEnMemoriaStore.prototype.guardar.call(estado, nuevo);
      });
    sensor.onModuleInit();
    cliente.emit('message', topico, Buffer.from('{"presencia":true}'));
    cliente.emit('message', topico, Buffer.from('{"presencia":false}'));
    await procesar();
    expect(guardar).toHaveBeenCalledTimes(1);
    liberar();
    await procesar();
    expect(guardar.mock.calls.map(([nuevo]) => nuevo.vehiculoPresente)).toEqual(
      [true, false],
    );
    expect((await estado.obtener()).vehiculoPresente).toBe(false);
  });

  it('un fallo de almacenamiento no impide procesar la siguiente señal', async () => {
    jest
      .spyOn(estado, 'guardar')
      .mockRejectedValueOnce(new Error('detalle privado'));
    sensor.onModuleInit();
    cliente.emit('message', topico, Buffer.from('{"presencia":true}'));
    await procesar();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'No se pudo actualizar la presencia del carril',
    );
    cliente.emit('message', topico, Buffer.from('{"presencia":true}'));
    await procesar();
    expect((await estado.obtener()).vehiculoPresente).toBe(true);
  });

  it('propaga fallos cuando se utiliza el puerto directamente', async () => {
    const fallo = new Error('No se pudo leer');
    const store: EstadoCarrilStore = {
      obtener: jest.fn().mockRejectedValue(fallo),
      guardar: jest.fn(),
    };
    const directo = new SensorMqtt(
      cliente as unknown as MqttClient,
      store,
      7,
      12,
    );
    await expect(directo.notificarPresencia(true)).rejects.toBe(fallo);
    expect(store.guardar).not.toHaveBeenCalled();
  });

  it.each(['error', 'rechazo'])(
    'registra el %s de suscripción sin lanzar ni exponer el detalle',
    (caso) => {
      sensor.onModuleInit();
      const callback = cliente.subscribe.mock
        .calls[0][2] as ClientSubscribeCallback;
      callback(
        caso === 'error' ? new Error('credencial privada') : null,
        caso === 'rechazo' ? [{ topic: topico, qos: 128 }] : undefined,
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'No se pudo suscribir el sensor MQTT',
      );
    },
  );

  it('retira solo su listener y su tópico al destruirse, sin cerrar el cliente compartido', async () => {
    const otroConsumidor = jest.fn();
    cliente.on('message', otroConsumidor);
    sensor.onModuleInit();
    await sensor.onModuleDestroy();
    const guardar = jest.spyOn(estado, 'guardar');
    cliente.emit('message', topico, Buffer.from('{"presencia":true}'));
    await procesar();
    expect(guardar).not.toHaveBeenCalled();
    expect(otroConsumidor).toHaveBeenCalledTimes(1);
    expect(cliente.listenerCount('message')).toBe(1);
    expect(cliente.unsubscribe).toHaveBeenCalledTimes(1);
    expect(cliente.unsubscribe).toHaveBeenCalledWith(
      topico,
      expect.any(Function),
    );
  });
});

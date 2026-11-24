import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { SensorMqtt } from './sensor-mqtt';
import { BarreraMqtt } from './barrera-mqtt';

describe('Resiliencia de adaptadores MQTT (CARQ-189)', () => {
  let cliente: EventEmitter & { subscribe: jest.Mock; unsubscribe: jest.Mock };
  let store: EstadoCarrilEnMemoriaStore;
  let sensor: SensorMqtt;
  let barrera: BarreraMqtt;
  const topicos = construirTopicosCarril(7, 12);
  const procesar = () =>
    new Promise<void>((resolver) => setImmediate(resolver));
  const presencia = (valor: boolean) =>
    cliente.emit(
      'message',
      topicos.sensor,
      Buffer.from(JSON.stringify({ presencia: valor })),
    );
  const estadoFisico = (valor: string) =>
    cliente.emit(
      'message',
      topicos.estadoBarrera,
      Buffer.from(JSON.stringify({ estado: valor })),
    );

  beforeEach(() => {
    cliente = Object.assign(new EventEmitter(), {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    });
    store = new EstadoCarrilEnMemoriaStore();
    sensor = new SensorMqtt(cliente as unknown as MqttClient, store, 7, 12);
    barrera = new BarreraMqtt(cliente as unknown as MqttClient, store, 7, 12);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    sensor.onModuleInit();
    barrera.onModuleInit();
  });

  afterEach(async () => {
    await Promise.all([sensor.onModuleDestroy(), barrera.onModuleDestroy()]);
    jest.restoreAllMocks();
  });

  it('ignora presencia repetida, incluida la ausencia inicial, y conserva las transiciones', async () => {
    const guardar = jest.spyOn(store, 'guardar');
    presencia(false);
    presencia(false);
    presencia(true);
    presencia(true);
    presencia(false);
    presencia(false);
    await procesar();
    expect(
      guardar.mock.calls.map(([estado]) => estado.vehiculoPresente),
    ).toEqual([true, false]);
    expect(await store.obtener()).toEqual(estadoCarrilInicial());
  });

  it('compara con el estado actual: una presencia idéntica cuenta si el flujo liberó el carril', async () => {
    presencia(true);
    await procesar();
    await store.guardar({
      ...(await store.obtener()),
      vehiculoPresente: false,
    });
    presencia(true);
    await procesar();
    expect((await store.obtener()).vehiculoPresente).toBe(true);
  });

  it.each(['sensor-primero', 'barrera-primero'])(
    'conserva presencia y estado físico ante mensajes simultáneos: %s',
    async (orden) => {
      if (orden === 'sensor-primero') {
        presencia(true);
        estadoFisico('abierta');
      } else {
        estadoFisico('abierta');
        presencia(true);
      }
      await procesar();
      expect(await store.obtener()).toEqual({
        ...estadoCarrilInicial(),
        vehiculoPresente: true,
        barrera: { estado: 'ABIERTA', motivo: null },
      });
    },
  );

  it('los mensajes inválidos no cambian el estado y no bloquean los siguientes', async () => {
    const anterior = {
      ...estadoCarrilInicial(),
      barrera: { estado: 'CERRADA' as const, motivo: 'Cobro pendiente' },
    };
    await store.guardar(anterior);
    const guardar = jest.spyOn(store, 'guardar');
    for (const payload of [
      '{',
      '{"presencia":"false"}',
      '{"estado":"abriendo"}',
      '{"token":"privado","placa":"ABC123"}',
    ]) {
      for (const topico of [topicos.sensor, topicos.estadoBarrera])
        cliente.emit('message', topico, Buffer.from(payload));
    }
    await procesar();
    expect(guardar).not.toHaveBeenCalled();
    expect(await store.obtener()).toEqual(anterior);
    expect(Logger.prototype.warn).toHaveBeenCalledTimes(8);
    expect(
      JSON.stringify(jest.mocked(Logger.prototype.warn).mock.calls),
    ).not.toMatch(/privado|ABC123/);
    presencia(true);
    await procesar();
    expect((await store.obtener()).vehiculoPresente).toBe(true);
  });
});

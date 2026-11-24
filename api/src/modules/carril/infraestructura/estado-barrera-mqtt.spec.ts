import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { MqttClient, ClientSubscribeCallback } from 'mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { BarreraMqtt } from './barrera-mqtt';

describe('Estado físico de barrera por MQTT (CARQ-188)', () => {
  let cliente: EventEmitter & {
    connected: boolean;
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    publish: jest.Mock;
  };
  let store: EstadoCarrilEnMemoriaStore;
  let barrera: BarreraMqtt;
  const topicos = construirTopicosCarril(7, 12);
  const procesar = () =>
    new Promise<void>((resolver) => setImmediate(resolver));
  const emitir = (estado: 'abierta' | 'cerrada') =>
    cliente.emit(
      'message',
      topicos.estadoBarrera,
      Buffer.from(JSON.stringify({ estado })),
    );

  beforeEach(() => {
    cliente = Object.assign(new EventEmitter(), {
      connected: true,
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      publish: jest.fn((_t, _p, _o, completar: (error?: Error) => void) =>
        completar(),
      ),
    });
    store = new EstadoCarrilEnMemoriaStore();
    barrera = new BarreraMqtt(cliente as unknown as MqttClient, store, 7, 12);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await barrera.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('suscribe una sola vez el tópico exacto sin esperar a la conexión', () => {
    cliente.connected = false;
    barrera.onModuleInit();
    barrera.onModuleInit();
    expect(cliente.subscribe).toHaveBeenCalledTimes(1);
    expect(cliente.subscribe).toHaveBeenCalledWith(
      topicos.estadoBarrera,
      { qos: 0 },
      expect.any(Function),
    );
    expect(cliente.listenerCount('message')).toBe(1);
  });

  it.each(['abierta', 'cerrada'] as const)(
    'refleja %s sin cambiar el motivo, la presencia, la lectura ni el resultado',
    async (estado) => {
      const anterior = {
        ...estadoCarrilInicial(),
        vehiculoPresente: true,
        sentido: 'ENTRADA' as const,
        ultimaLectura: {
          placa: 'ABC123',
          confianza: 0.99,
          origen: 'OCR' as const,
        },
        ultimoResultado: {
          resultado: 'AUTORIZADO' as const,
          motivo: 'Ingreso autorizado',
        },
        barrera: {
          estado:
            estado === 'abierta' ? ('CERRADA' as const) : ('ABIERTA' as const),
          motivo: 'Ingreso autorizado',
        },
      };
      await store.guardar(anterior);
      barrera.onModuleInit();
      emitir(estado);
      await procesar();
      expect(await store.obtener()).toEqual({
        ...anterior,
        barrera: {
          estado: estado === 'abierta' ? 'ABIERTA' : 'CERRADA',
          motivo: 'Ingreso autorizado',
        },
      });
      expect((await barrera.consultarEstado()).estado).toBe(
        estado === 'abierta' ? 'ABIERTA' : 'CERRADA',
      );
      expect(cliente.publish).not.toHaveBeenCalled();
    },
  );

  it('ignora mensajes de otra sede, otro carril o del tópico de comandos', async () => {
    barrera.onModuleInit();
    const guardar = jest.spyOn(store, 'guardar');
    for (const topico of [
      construirTopicosCarril(8, 12).estadoBarrera,
      construirTopicosCarril(7, 13).estadoBarrera,
      topicos.comandoBarrera,
    ])
      cliente.emit('message', topico, Buffer.from('{"estado":"abierta"}'));
    await procesar();
    expect(guardar).not.toHaveBeenCalled();
  });

  it.each([
    '{',
    '{"estado":"abriendo"}',
    '{"estado":true}',
    '{"estado":"abierta","token":"privado"}',
  ])(
    'descarta %s sin modificar el estado ni reflejar el payload en logs',
    async (payload) => {
      barrera.onModuleInit();
      const guardar = jest.spyOn(store, 'guardar');
      cliente.emit('message', topicos.estadoBarrera, Buffer.from(payload));
      await procesar();
      expect(guardar).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Mensaje de estado de barrera MQTT inválido descartado',
      );
    },
  );

  it('aplica apertura y cierre en orden aunque el almacenamiento se demore', async () => {
    let liberar!: () => void;
    const espera = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    const guardar = jest
      .spyOn(store, 'guardar')
      .mockImplementationOnce(async (estado) => {
        await espera;
        await EstadoCarrilEnMemoriaStore.prototype.guardar.call(store, estado);
      });
    barrera.onModuleInit();
    emitir('abierta');
    emitir('cerrada');
    await procesar();
    expect(guardar).toHaveBeenCalledTimes(1);
    liberar();
    await procesar();
    expect(guardar.mock.calls.map(([estado]) => estado.barrera.estado)).toEqual(
      ['ABIERTA', 'CERRADA'],
    );
    expect((await barrera.consultarEstado()).estado).toBe('CERRADA');
  });

  it('recibe la confirmación física incluso con una publicación pendiente', async () => {
    let completar!: () => void;
    cliente.publish.mockImplementationOnce(
      (_t, _p, _o, callback: () => void) => {
        completar = callback;
      },
    );
    barrera.onModuleInit();
    const apertura = barrera.abrir('Ingreso autorizado');
    await procesar();
    emitir('abierta');
    await procesar();
    expect((await store.obtener()).barrera).toEqual({
      estado: 'ABIERTA',
      motivo: null,
    });
    completar();
    await apertura;
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'ABIERTA',
      motivo: 'Ingreso autorizado',
    });
  });

  it('un fallo de guardado se registra sin impedir mensajes posteriores', async () => {
    jest
      .spyOn(store, 'guardar')
      .mockRejectedValueOnce(new Error('detalle privado'));
    barrera.onModuleInit();
    emitir('abierta');
    await procesar();
    expect(Logger.prototype.error).toHaveBeenCalledWith(
      'No se pudo actualizar el estado físico de la barrera',
    );
    emitir('abierta');
    await procesar();
    expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
  });

  it.each(['error', 'rechazo'])(
    'registra un %s de suscripción con un mensaje genérico',
    (caso) => {
      barrera.onModuleInit();
      const completar = cliente.subscribe.mock
        .calls[0][2] as ClientSubscribeCallback;
      completar(
        caso === 'error' ? new Error('credencial privada') : null,
        caso === 'rechazo'
          ? [{ topic: topicos.estadoBarrera, qos: 128 }]
          : undefined,
      );
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'No se pudo suscribir el estado de barrera MQTT',
      );
    },
  );

  it('al destruirse retira solo su tópico y listener y deja de actualizar', async () => {
    const otroConsumidor = jest.fn();
    cliente.on('message', otroConsumidor);
    barrera.onModuleInit();
    await barrera.onModuleDestroy();
    const guardar = jest.spyOn(store, 'guardar');
    emitir('abierta');
    await procesar();
    expect(guardar).not.toHaveBeenCalled();
    expect(otroConsumidor).toHaveBeenCalledTimes(1);
    expect(cliente.listenerCount('message')).toBe(1);
    expect(cliente.unsubscribe).toHaveBeenCalledTimes(1);
    expect(cliente.unsubscribe).toHaveBeenCalledWith(
      topicos.estadoBarrera,
      expect.any(Function),
    );
  });
});

import { EventEmitter } from 'node:events';
import type { MqttClient } from 'mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { BarreraMqtt } from './barrera-mqtt';

type AlPublicar = (error?: Error) => void;

describe('Publicación de comandos de barrera MQTT (CARQ-187)', () => {
  let cliente: EventEmitter & {
    connected: boolean;
    disconnecting: boolean;
    disconnected: boolean;
    stream: object;
    publish: jest.Mock;
  };
  let estado: EstadoCarrilEnMemoriaStore;
  let barrera: BarreraMqtt;
  const topico = construirTopicosCarril(7, 12).comandoBarrera;
  const avanzar = () => new Promise<void>((resolver) => setImmediate(resolver));

  beforeEach(() => {
    cliente = Object.assign(new EventEmitter(), {
      connected: true,
      disconnecting: false,
      disconnected: false,
      stream: {},
      publish: jest.fn((_topico, _payload, _opciones, callback: AlPublicar) =>
        callback(),
      ),
    });
    estado = new EstadoCarrilEnMemoriaStore();
    barrera = new BarreraMqtt(cliente as unknown as MqttClient, estado, 7, 12);
  });

  afterEach(() => jest.useRealTimers());

  it.each(['abrir', 'denegar', 'cerrar'] as const)(
    '%s publica el JSON acordado sin retain, reintentos ni motivos en el payload',
    async (comando) => {
      await barrera[comando]('Motivo privado ABC123');
      expect(cliente.publish).toHaveBeenCalledTimes(1);
      expect(cliente.publish).toHaveBeenCalledWith(
        topico,
        JSON.stringify({ comando }),
        { qos: 0, retain: false },
        expect.any(Function),
      );
      expect(cliente.listenerCount('close')).toBe(0);
      expect(cliente.listenerCount('error')).toBe(0);
    },
  );

  it.each(['abrir', 'denegar', 'cerrar'] as const)(
    '%s actualiza solo el motivo conservando el estado físico conocido',
    async (comando) => {
      const anterior = {
        ...estadoCarrilInicial(),
        vehiculoPresente: true,
        barrera: { estado: 'ABIERTA' as const, motivo: 'Motivo anterior' },
      };
      await estado.guardar(anterior);
      await barrera[comando]('Motivo nuevo');
      expect(await estado.obtener()).toEqual({
        ...anterior,
        barrera: { estado: 'ABIERTA', motivo: 'Motivo nuevo' },
      });
      expect(anterior.barrera.motivo).toBe('Motivo anterior');
    },
  );

  it('abrir no confirma una apertura antes de recibir el estado físico', async () => {
    await barrera.abrir('Ingreso autorizado');
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'CERRADA',
      motivo: 'Ingreso autorizado',
    });
  });

  it.each(['connected', 'disconnecting', 'disconnected'] as const)(
    'rechaza sin publicar si la conexión no está disponible por %s',
    async (campo) => {
      cliente[campo] = campo !== 'connected';
      await expect(barrera.abrir('Ingreso autorizado')).rejects.toMatchObject({
        codigo: 'BARRERA_NO_DISPONIBLE',
      });
      expect(cliente.publish).not.toHaveBeenCalled();
      expect(await estado.obtener()).toEqual(estadoCarrilInicial());
    },
  );

  it.each(['callback', 'excepcion'])(
    'un fallo de publicación por %s conserva el estado y no reintenta',
    async (modo) => {
      cliente.publish.mockImplementationOnce(
        (_t, _p, _o, callback: AlPublicar) => {
          const error = new Error('mqtt://usuario:clave@broker ABC123');
          if (modo === 'excepcion') throw error;
          callback(error);
        },
      );
      await expect(barrera.abrir('Ingreso autorizado')).rejects.toMatchObject({
        codigo: 'BARRERA_NO_DISPONIBLE',
        message: 'No se pudo confirmar la publicación del comando de barrera',
      });
      expect(cliente.publish).toHaveBeenCalledTimes(1);
      expect(await estado.obtener()).toEqual(estadoCarrilInicial());
      expect(cliente.listenerCount('close')).toBe(0);
      expect(cliente.listenerCount('error')).toBe(0);
      await barrera.denegar('Revisión requerida');
      expect(cliente.publish).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['close', 'error'])(
    'rechaza una publicación pendiente al recibir %s y limpia sus listeners',
    async (evento) => {
      cliente.publish.mockImplementationOnce(() => undefined);
      const operacion = barrera.abrir('Ingreso autorizado');
      const rechazo = expect(operacion).rejects.toMatchObject({
        codigo: 'BARRERA_NO_DISPONIBLE',
      });
      await avanzar();
      cliente.emit(evento, new Error('detalle privado'));
      await rechazo;
      expect(await estado.obtener()).toEqual(estadoCarrilInicial());
      expect(cliente.listenerCount('close')).toBe(0);
      expect(cliente.listenerCount('error')).toBe(0);
    },
  );

  it('limita la espera, no confirma callbacks tardíos y no reintenta', async () => {
    jest.useFakeTimers();
    let completar!: AlPublicar;
    cliente.publish.mockImplementationOnce(
      (_t, _p, _o, callback: AlPublicar) => {
        completar = callback;
      },
    );
    const operacion = barrera.abrir('Ingreso autorizado');
    const rechazo = expect(operacion).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    await jest.advanceTimersByTimeAsync(5000);
    await rechazo;
    completar();
    await Promise.resolve();
    expect(await estado.obtener()).toEqual(estadoCarrilInicial());
    expect(cliente.publish).toHaveBeenCalledTimes(1);
    expect(cliente.listenerCount('close')).toBe(0);
    expect(cliente.listenerCount('error')).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('publica órdenes consecutivas en orden y conserva el motivo de la última', async () => {
    let completar!: AlPublicar;
    cliente.publish.mockImplementationOnce(
      (_t, _p, _o, callback: AlPublicar) => {
        completar = callback;
      },
    );
    const apertura = barrera.abrir('Ingreso autorizado');
    const rechazo = barrera.denegar('Ingreso rechazado');
    await avanzar();
    expect(cliente.publish).toHaveBeenCalledTimes(1);
    completar();
    await Promise.all([apertura, rechazo]);
    expect(
      cliente.publish.mock.calls.map(
        ([, payload]) => JSON.parse(payload).comando,
      ),
    ).toEqual(['abrir', 'denegar']);
    expect((await barrera.consultarEstado()).motivo).toBe('Ingreso rechazado');
  });

  it('consultar devuelve una copia del último estado conocido', async () => {
    const consulta = await barrera.consultarEstado();
    Reflect.set(consulta, 'motivo', 'Cambio externo');
    expect((await estado.obtener()).barrera.motivo).toBeNull();
  });

  it('rechaza inmediatamente una orden recibida sin conexión aunque otra siga pendiente', async () => {
    let completar!: AlPublicar;
    cliente.publish.mockImplementationOnce(
      (_t, _p, _o, callback: AlPublicar) => {
        completar = callback;
      },
    );
    const apertura = barrera.abrir('Ingreso autorizado');
    await avanzar();
    cliente.connected = false;
    await expect(barrera.denegar('Rechazo')).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    completar();
    await apertura;
    expect(cliente.publish).toHaveBeenCalledTimes(1);
  });

  it('no publica una orden antigua en una conexión restablecida', async () => {
    cliente.publish.mockImplementationOnce(() => undefined);
    const apertura = barrera.abrir('Ingreso autorizado');
    const aperturaRechazada = expect(apertura).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    await avanzar();
    const cierre = barrera.cerrar('Cierre pendiente');
    const cierreRechazado = expect(cierre).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    cliente.emit('close');
    cliente.stream = {};
    await Promise.all([aperturaRechazada, cierreRechazado]);
    expect(cliente.publish).toHaveBeenCalledTimes(1);
    expect(await estado.obtener()).toEqual(estadoCarrilInicial());
  });
});

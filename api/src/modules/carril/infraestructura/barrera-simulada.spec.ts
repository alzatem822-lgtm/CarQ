import { Logger } from '@nestjs/common';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { BarreraSimulada } from './barrera-simulada';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';

describe('BarreraSimulada', () => {
  let estadoCarril: EstadoCarrilEnMemoriaStore;
  let barrera: BarreraSimulada;

  beforeEach(() => {
    jest.useFakeTimers();
    estadoCarril = new EstadoCarrilEnMemoriaStore();
    barrera = new BarreraSimulada(estadoCarril);
  });

  afterEach(async () => {
    await barrera.onModuleDestroy();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('consulta la barrera cerrada inicial', async () => {
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'CERRADA',
      motivo: null,
    });
  });

  it('abre con motivo y cierra automáticamente a los cinco segundos', async () => {
    await barrera.abrir('Ingreso autorizado');
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'ABIERTA',
      motivo: 'Ingreso autorizado',
    });

    await jest.advanceTimersByTimeAsync(4999);
    expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
    await jest.advanceTimersByTimeAsync(1);
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'CERRADA',
      motivo: 'Ingreso autorizado',
    });
  });

  it('conserva los datos que cambiaron después de abrir al ejecutar el cierre', async () => {
    await barrera.abrir('Ingreso autorizado');
    const actual = {
      ...(await estadoCarril.obtener()),
      vehiculoPresente: true,
      sentido: 'SALIDA' as const,
      ultimaLectura: {
        placa: 'ABC123',
        confianza: 0.7,
        origen: 'SIMULADO' as const,
      },
      requiereValidacionManual: true,
    };
    await estadoCarril.guardar(actual);

    await jest.advanceTimersByTimeAsync(5000);

    expect(await estadoCarril.obtener()).toEqual({
      ...actual,
      barrera: { estado: 'CERRADA', motivo: 'Ingreso autorizado' },
    });
  });

  it('deniega con motivo y conserva cerrada la barrera', async () => {
    await barrera.denegar('LLENO');

    expect(await estadoCarril.obtener()).toEqual({
      ...estadoCarrilInicial(),
      barrera: { estado: 'CERRADA', motivo: 'LLENO' },
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['LLENO', 'Cobro pendiente', 'Ingreso ya registrado'])(
    'rechaza con %s sin cerrar antes ni prolongar la apertura anterior',
    async (motivo) => {
      await barrera.abrir('Ingreso autorizado');
      await jest.advanceTimersByTimeAsync(4000);
      await barrera.denegar(motivo);
      expect(await barrera.consultarEstado()).toEqual({
        estado: 'ABIERTA',
        motivo,
      });
      expect(jest.getTimerCount()).toBe(1);

      await jest.advanceTimersByTimeAsync(999);
      expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
      await jest.advanceTimersByTimeAsync(1);
      expect(await barrera.consultarEstado()).toEqual({
        estado: 'CERRADA',
        motivo,
      });
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('los rechazos repetidos no reinician el plazo ni abren al terminar el ciclo', async () => {
    await barrera.abrir('Ingreso autorizado');
    for (let intento = 0; intento < 4; intento++) {
      await jest.advanceTimersByTimeAsync(1000);
      await barrera.denegar('LLENO');
    }
    await jest.advanceTimersByTimeAsync(1000);
    await barrera.denegar('LLENO');
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'CERRADA',
      motivo: 'LLENO',
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reinicia el plazo al recibir una nueva apertura', async () => {
    await barrera.abrir('Primera autorización');
    await jest.advanceTimersByTimeAsync(4000);
    await barrera.abrir('Segunda autorización');
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(1000);
    expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
    await jest.advanceTimersByTimeAsync(4000);
    expect(await barrera.consultarEstado()).toEqual({
      estado: 'CERRADA',
      motivo: 'Segunda autorización',
    });
  });

  it('retira el temporizador al apagar el módulo', async () => {
    await barrera.abrir('Ingreso autorizado');

    await barrera.onModuleDestroy();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('propaga un fallo al abrir y no programa un cierre ficticio', async () => {
    const error = new Error('Fallo de guardado');
    jest.spyOn(estadoCarril, 'guardar').mockRejectedValueOnce(error);

    await expect(barrera.abrir('Ingreso autorizado')).rejects.toBe(error);
    expect(jest.getTimerCount()).toBe(0);
    expect((await barrera.consultarEstado()).estado).toBe('CERRADA');
    await barrera.abrir('Reintento autorizado');
    expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
  });

  it('propaga los fallos de lectura y de denegación', async () => {
    const error = new Error('Fallo de estado');
    const store: jest.Mocked<EstadoCarrilStore> = {
      obtener: jest.fn().mockRejectedValue(error),
      guardar: jest.fn(),
    };
    const conFallo = new BarreraSimulada(store);
    await expect(conFallo.consultarEstado()).rejects.toBe(error);
    await expect(conFallo.denegar('LLENO')).rejects.toBe(error);
    expect(store.guardar).not.toHaveBeenCalled();
  });

  it('registra el fallo de cierre sin confirmar un estado que no se guardó', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    await barrera.abrir('Ingreso autorizado');
    jest
      .spyOn(estadoCarril, 'guardar')
      .mockRejectedValueOnce(new Error('Fallo'));

    await jest.advanceTimersByTimeAsync(5000);

    expect(log).toHaveBeenCalledWith(
      'No se pudo registrar el cierre automático simulado',
    );
    expect((await barrera.consultarEstado()).estado).toBe('ABIERTA');
  });
});

import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { EstadoCarril, estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { SensorSimulado } from './sensor-simulado';

describe('SensorSimulado', () => {
  it('marca presencia al simular una llegada sobre el estado inicial', async () => {
    const estadoCarril = new EstadoCarrilEnMemoriaStore();
    const sensor = new SensorSimulado(estadoCarril);

    await sensor.notificarPresencia(true);

    expect(await estadoCarril.obtener()).toEqual({
      ...estadoCarrilInicial(),
      vehiculoPresente: true,
    });
  });

  it.each([true, false])(
    'notifica presencia %s conservando el resto del estado',
    async (presente) => {
      const estadoCarril = new EstadoCarrilEnMemoriaStore();
      const sensor = new SensorSimulado(estadoCarril);
      const anterior: EstadoCarril = {
        vehiculoPresente: !presente,
        sentido: 'SALIDA',
        ultimaLectura: { placa: 'ABC123', confianza: 0.7, origen: 'SIMULADO' },
        ultimoResultado: { resultado: 'RECHAZADO', motivo: 'Cobro pendiente' },
        barrera: { estado: 'CERRADA', motivo: 'Cobro pendiente' },
        requiereValidacionManual: true,
      };
      await estadoCarril.guardar(anterior);

      await sensor.notificarPresencia(presente);

      expect(await estadoCarril.obtener()).toEqual({
        ...anterior,
        vehiculoPresente: presente,
      });
      expect(anterior.vehiculoPresente).toBe(!presente);
    },
  );

  it('propaga un fallo de lectura sin intentar guardar un estado inventado', async () => {
    const error = new Error('No se pudo leer el estado');
    const estadoCarril: jest.Mocked<EstadoCarrilStore> = {
      obtener: jest.fn().mockRejectedValue(error),
      guardar: jest.fn(),
    };

    await expect(
      new SensorSimulado(estadoCarril).notificarPresencia(true),
    ).rejects.toBe(error);
    expect(estadoCarril.guardar).not.toHaveBeenCalled();
  });

  it('propaga un fallo de guardado sin confirmar la notificación', async () => {
    const error = new Error('No se pudo guardar el estado');
    const estadoCarril: jest.Mocked<EstadoCarrilStore> = {
      obtener: jest.fn().mockResolvedValue(estadoCarrilInicial()),
      guardar: jest.fn().mockRejectedValue(error),
    };

    await expect(
      new SensorSimulado(estadoCarril).notificarPresencia(true),
    ).rejects.toBe(error);
  });
});

import { BarreraCarril } from '../aplicacion/barrera-carril';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { BarreraSimulada } from './barrera-simulada';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { crearBarreraCarril } from './fabrica-barrera-carril';
import { crearSensorPresencia } from './fabrica-sensor-presencia';
import { SensorSimulado } from './sensor-simulado';

describe('Fábricas del carril', () => {
  it('selecciona el sensor simulado con el estado compartido', async () => {
    const estado = new EstadoCarrilEnMemoriaStore();
    const crearMqtt = jest.fn();
    const sensor = crearSensorPresencia('simulado', estado, crearMqtt);

    expect(sensor).toBeInstanceOf(SensorSimulado);
    await sensor.notificarPresencia(true);
    expect((await estado.obtener()).vehiculoPresente).toBe(true);
    expect(crearMqtt).not.toHaveBeenCalled();
  });

  it('selecciona la barrera simulada con el estado compartido', async () => {
    const estado = new EstadoCarrilEnMemoriaStore();
    const crearMqtt = jest.fn();
    const barrera = crearBarreraCarril('simulado', estado, crearMqtt);

    expect(barrera).toBeInstanceOf(BarreraSimulada);
    await barrera.denegar('LLENO');
    expect((await estado.obtener()).barrera).toEqual({
      estado: 'CERRADA',
      motivo: 'LLENO',
    });
    expect(crearMqtt).not.toHaveBeenCalled();
  });

  it('selecciona el constructor MQTT suministrado para cada puerto', () => {
    const estado = new EstadoCarrilEnMemoriaStore();
    const sensor: SensorPresencia = { notificarPresencia: jest.fn() };
    const barrera: BarreraCarril = {
      abrir: jest.fn(),
      denegar: jest.fn(),
      consultarEstado: jest.fn(),
    };
    const crearSensorMqtt = jest.fn(() => sensor);
    const crearBarreraMqtt = jest.fn(() => barrera);

    expect(crearSensorPresencia('mqtt', estado, crearSensorMqtt)).toBe(sensor);
    expect(crearBarreraCarril('mqtt', estado, crearBarreraMqtt)).toBe(barrera);
    expect(crearSensorMqtt).toHaveBeenCalledTimes(1);
    expect(crearBarreraMqtt).toHaveBeenCalledTimes(1);
  });

  it('rechaza MQTT sin sensor disponible, sin recurrir al simulador', () => {
    expect(() =>
      crearSensorPresencia('mqtt', new EstadoCarrilEnMemoriaStore()),
    ).toThrow(expect.objectContaining({ codigo: 'SENSOR_NO_DISPONIBLE' }));
  });

  it('rechaza MQTT sin barrera disponible, sin recurrir al simulador', () => {
    expect(() =>
      crearBarreraCarril('mqtt', new EstadoCarrilEnMemoriaStore()),
    ).toThrow(expect.objectContaining({ codigo: 'BARRERA_NO_DISPONIBLE' }));
  });
});

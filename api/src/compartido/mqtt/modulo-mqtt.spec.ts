import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { MqttClient } from 'mqtt';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';
import { CLIENTE_MQTT, ModuloMqtt } from './modulo-mqtt';

const obtener = jest.fn();

@Global()
@Module({
  providers: [{ provide: ConfiguracionSistema, useValue: { obtener } }],
  exports: [ConfiguracionSistema],
})
class ConfiguracionPruebas {}

describe('ModuloMqtt (CARQ-183)', () => {
  it.each([
    ['simulado', 'simulado', false],
    ['mqtt', 'simulado', true],
    ['simulado', 'mqtt', true],
    ['mqtt', 'mqtt', true],
  ])(
    'activa un único cliente con sensor %s y barrera %s',
    async (sensor, barrera, activo) => {
      const config: Record<string, string> = {
        FUENTE_SENSOR: sensor as string,
        CONTROLADOR_BARRERA: barrera as string,
        URL_MQTT: 'mqtt://127.0.0.1:1',
      };
      obtener.mockImplementation((clave: string) => config[clave]);
      const modulo = await Test.createTestingModule({
        imports: [ConfiguracionPruebas, ModuloMqtt],
      }).compile();
      try {
        const cliente = modulo.get<MqttClient | null>(CLIENTE_MQTT);
        if (activo) {
          expect(cliente).not.toBeNull();
          expect(modulo.get(CLIENTE_MQTT)).toBe(cliente);
          expect(cliente?.stream).toBeUndefined();
          const conectar = jest.spyOn(cliente!, 'connect');
          // El broker no responde: el arranque no espera ni rechaza por ello.
          await modulo.init();
          expect(conectar).toHaveBeenCalledTimes(1);
          expect(cliente?.connected).toBe(false);
        } else {
          expect(cliente).toBeNull();
          await modulo.init();
        }
      } finally {
        await modulo.close();
        expect(
          modulo.get<MqttClient | null>(CLIENTE_MQTT)?.options
            .reconnectPeriod ?? 0,
        ).toBe(0);
      }
    },
  );

  it('cierra la conexión y cancela reintentos al apagar la aplicación', async () => {
    const cliente = {
      stream: {},
      options: { reconnectPeriod: 1000 },
      connect: jest.fn(),
      endAsync: jest.fn().mockResolvedValue(undefined),
    };
    const modulo = new ModuloMqtt(cliente as unknown as MqttClient);
    modulo.onModuleInit();
    expect(cliente.connect).toHaveBeenCalledTimes(1);
    await modulo.onApplicationShutdown();
    expect(cliente.endAsync).toHaveBeenCalledWith(true);
    expect(cliente.options.reconnectPeriod).toBe(0);
  });
});

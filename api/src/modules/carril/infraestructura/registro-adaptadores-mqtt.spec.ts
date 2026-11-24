import type { FactoryProvider, Provider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EventEmitter } from 'node:events';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { CLIENTE_MQTT } from '../../../compartido/mqtt/modulo-mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { CarrilModule } from '../carril.module';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';
import { SensorSimulado } from './sensor-simulado';
import { BarreraSimulada } from './barrera-simulada';
import { SensorMqtt } from './sensor-mqtt';
import { BarreraMqtt } from './barrera-mqtt';

// Se ejercitan las fábricas registradas en producción, sin copiarlas en el test.
const proveedores = (
  Reflect.getMetadata('providers', CarrilModule) as Provider[]
).filter(
  (p): p is FactoryProvider =>
    typeof p === 'object' &&
    'useFactory' in p &&
    (p.provide === SensorPresencia || p.provide === BarreraCarril),
);

describe('Registro de adaptadores del carril (CARQ-190)', () => {
  it.each([
    ['simulado', 'simulado'],
    ['mqtt', 'simulado'],
    ['simulado', 'mqtt'],
    ['mqtt', 'mqtt'],
  ])(
    'selecciona sensor %s y barrera %s con el estado compartido',
    async (fuente, controlador) => {
      const store = new EstadoCarrilEnMemoriaStore();
      const mqtt = Object.assign(new EventEmitter(), {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      });
      const resolver = jest.fn().mockResolvedValue({ sedeId: 7, carrilId: 12 });
      const config: Record<string, string> = {
        FUENTE_SENSOR: fuente,
        CONTROLADOR_BARRERA: controlador,
      };
      const modulo = await Test.createTestingModule({
        providers: [
          ...proveedores,
          {
            provide: ConfiguracionSistema,
            useValue: { obtener: (clave: string) => config[clave] },
          },
          { provide: EstadoCarrilStore, useValue: store },
          { provide: CLIENTE_MQTT, useValue: mqtt },
          { provide: 'ResolverCarrilIngreso', useValue: resolver },
        ],
      }).compile();
      try {
        expect(modulo.get(SensorPresencia)).toBeInstanceOf(
          fuente === 'mqtt' ? SensorMqtt : SensorSimulado,
        );
        expect(modulo.get(BarreraCarril)).toBeInstanceOf(
          controlador === 'mqtt' ? BarreraMqtt : BarreraSimulada,
        );
        expect(resolver).toHaveBeenCalledTimes(
          Number(fuente === 'mqtt') + Number(controlador === 'mqtt'),
        );
        await modulo.init();
        const topicos = construirTopicosCarril(7, 12);
        expect(
          mqtt.subscribe.mock.calls.map(([topico]) => topico).sort(),
        ).toEqual(
          [
            ...(fuente === 'mqtt' ? [topicos.sensor] : []),
            ...(controlador === 'mqtt' ? [topicos.estadoBarrera] : []),
          ].sort(),
        );
        if (fuente === 'mqtt') {
          mqtt.emit(
            'message',
            topicos.sensor,
            Buffer.from('{"presencia":true}'),
          );
          await new Promise<void>((r) => setImmediate(r));
        } else await modulo.get(SensorPresencia).notificarPresencia(true);
        expect((await store.obtener()).vehiculoPresente).toBe(true);
      } finally {
        await modulo.close();
      }
    },
  );

  it.each([SensorPresencia, BarreraCarril])(
    'rechaza MQTT sin cliente disponible para %p',
    async (puerto) => {
      const proveedor = proveedores.find((p) => p.provide === puerto)!;
      const resolver = jest.fn();
      await expect(
        proveedor.useFactory(
          { obtener: () => 'mqtt' },
          new EstadoCarrilEnMemoriaStore(),
          null,
          resolver,
        ),
      ).rejects.toMatchObject({
        codigo:
          puerto === SensorPresencia
            ? 'SENSOR_NO_DISPONIBLE'
            : 'BARRERA_NO_DISPONIBLE',
      });
      expect(resolver).not.toHaveBeenCalled();
    },
  );
});

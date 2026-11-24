import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';
import { crearClienteMqtt } from './crear-cliente-mqtt';

export const CLIENTE_MQTT = Symbol('CLIENTE_MQTT');

@Global()
@Module({
  providers: [
    {
      provide: CLIENTE_MQTT,
      inject: [ConfiguracionSistema],
      useFactory: (config: ConfiguracionSistema): MqttClient | null => {
        if (
          config.obtener('FUENTE_SENSOR') !== 'mqtt' &&
          config.obtener('CONTROLADOR_BARRERA') !== 'mqtt'
        )
          return null;
        const logger = new Logger('MQTT');
        return crearClienteMqtt(config.obtener('URL_MQTT'), (estado) => {
          if (estado === 'conectado') logger.log('MQTT conectado');
          else logger.warn('MQTT no disponible; se reintentará la conexión');
        });
      },
    },
  ],
  exports: [CLIENTE_MQTT],
})
export class ModuloMqtt implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(CLIENTE_MQTT) private readonly cliente: MqttClient | null,
  ) {}

  onModuleInit(): void {
    this.cliente?.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    // Fuerza el cierre para no esperar al broker ni dejar reconexiones pendientes.
    if (this.cliente) {
      this.cliente.options.reconnectPeriod = 0;
      if (this.cliente.stream) await this.cliente.endAsync(true);
    }
  }
}

import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import type { Redis } from 'ioredis';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';
import { crearClienteRedis } from './crear-cliente-redis';

export const CLIENTE_REDIS = Symbol('CLIENTE_REDIS');

@Global()
@Module({
  providers: [
    {
      provide: CLIENTE_REDIS,
      inject: [ConfiguracionSistema],
      useFactory: (config: ConfiguracionSistema): Redis => {
        const logger = new Logger('Redis');
        return crearClienteRedis(config.obtener('URL_REDIS'), (error) =>
          logger.warn(`Redis no disponible: ${error.message}`),
        );
      },
    },
  ],
  exports: [CLIENTE_REDIS],
})
export class ModuloRedis implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(CLIENTE_REDIS) private readonly cliente: Redis) {}

  onModuleInit(): void {
    this.cliente.connect().catch(() => undefined);
  }

  onApplicationShutdown(): void {
    this.cliente.disconnect();
  }
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfiguracionSistema],
      useFactory: (config: ConfiguracionSistema) => ({
        type: 'postgres' as const,
        url: config.obtener('URL_BASE_DATOS'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
})
export class ModuloBaseDatos {}
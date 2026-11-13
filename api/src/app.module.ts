import { Module } from '@nestjs/common';
import { ModuloBaseDatos } from './compartido/base-datos/modulo-base-datos';
import { ModuloConfiguracionSistema } from './compartido/configuracion/modulo-configuracion-sistema';
import { ModuloLogging } from './compartido/logging/modulo-logging';
import { ModuloRedis } from './compartido/redis/modulo-redis';
import { VehiculosModule } from './modules/vehiculos/vehiculos.module';
import { AccesoModule } from './modules/acceso/acceso.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [
    ModuloConfiguracionSistema,
    ModuloLogging,
    ModuloRedis,
    ModuloBaseDatos,
    VehiculosModule,
    AccesoModule,
    ConfiguracionModule,
  ],
})
export class AppModule {}
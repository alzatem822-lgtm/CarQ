import { Module } from '@nestjs/common';
import { ModuloConfiguracionSistema } from './compartido/configuracion/modulo-configuracion-sistema';
import { VehiculosModule } from './modules/vehiculos/vehiculos.module';
import { AccesoModule } from './modules/acceso/acceso.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [
    ModuloConfiguracionSistema,
    VehiculosModule,
    AccesoModule,
    ConfiguracionModule,
  ],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { VehiculosModule } from './modules/vehiculos/vehiculos.module';
import { AccesoModule } from './modules/acceso/acceso.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [VehiculosModule, AccesoModule, ConfiguracionModule],
})
export class AppModule {}
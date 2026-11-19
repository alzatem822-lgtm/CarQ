import { Module } from '@nestjs/common';
import { AccesoModule } from '../acceso/acceso.module';
import { SimulacionCarrilController } from './adaptadores-entrada/simulacion-carril.controller';
import { SensorPresencia } from './aplicacion/sensor-presencia';
import { SimularLlegada } from './aplicacion/simular-llegada';
import { CarrilModule } from './carril.module';

@Module({
  imports: [CarrilModule, AccesoModule],
  controllers: [SimulacionCarrilController],
  providers: [
    {
      provide: SimularLlegada,
      useFactory: (sensor: SensorPresencia) => new SimularLlegada(sensor),
      inject: [SensorPresencia],
    },
  ],
})
export class SimulacionCarrilModule {}

import { Module } from '@nestjs/common';
import { ConfiguracionSistema } from '../../compartido/configuracion/configuracion-sistema';
import { LectorPlaca } from './aplicacion/lector-placa';
import { crearLectorPlaca } from './infraestructura/fabrica-lector-placa';

@Module({
  providers: [
    {
      provide: LectorPlaca,
      inject: [ConfiguracionSistema],
      useFactory: (configuracion: ConfiguracionSistema): LectorPlaca =>
        crearLectorPlaca(configuracion.obtener('LECTOR_PLACAS')),
    },
  ],
  exports: [LectorPlaca],
})
export class VehiculosModule {}
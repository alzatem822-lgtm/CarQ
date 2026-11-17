import { Module } from '@nestjs/common';
import { EstadoCarrilStore } from './aplicacion/estado-carril.store';
import { EstadoCarrilEnMemoriaStore } from './infraestructura/estado-carril-en-memoria.store';

@Module({
  providers: [
    { provide: EstadoCarrilStore, useClass: EstadoCarrilEnMemoriaStore },
  ],
  exports: [EstadoCarrilStore],
})
export class CarrilModule {}
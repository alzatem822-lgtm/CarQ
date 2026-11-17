import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoCarrilStore } from './aplicacion/estado-carril.store';
import { EstanciaRepository } from './aplicacion/estancia.repository';
import { EstadoCarrilEnMemoriaStore } from './infraestructura/estado-carril-en-memoria.store';
import { EstanciaPostgresRepository } from './infraestructura/estancia-postgres.repository';

@Module({
  providers: [
    { provide: EstadoCarrilStore, useClass: EstadoCarrilEnMemoriaStore },
    {
      provide: EstanciaRepository,
      useFactory: (origen: DataSource) => new EstanciaPostgresRepository(origen),
      inject: [DataSource],
    },
  ],
  exports: [EstadoCarrilStore],
})
export class CarrilModule {}
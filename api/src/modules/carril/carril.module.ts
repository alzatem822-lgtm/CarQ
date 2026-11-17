import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoCarrilStore } from './aplicacion/estado-carril.store';
import { EstanciaRepository } from './aplicacion/estancia.repository';
import { EventoRepository } from './aplicacion/evento.repository';
import { EstadoCarrilEnMemoriaStore } from './infraestructura/estado-carril-en-memoria.store';
import { EstanciaPostgresRepository } from './infraestructura/estancia-postgres.repository';
import { EventoPostgresRepository } from './infraestructura/evento-postgres.repository';

@Module({
  providers: [
    { provide: EstadoCarrilStore, useClass: EstadoCarrilEnMemoriaStore },
    {
      provide: EstanciaRepository,
      useFactory: (origen: DataSource) => new EstanciaPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: EventoRepository,
      useFactory: (origen: DataSource) => new EventoPostgresRepository(origen),
      inject: [DataSource],
    },
  ],
  exports: [EstadoCarrilStore],
})
export class CarrilModule {}
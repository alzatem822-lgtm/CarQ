import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccesoModule } from '../acceso/acceso.module';
import { obtenerIdSedePrincipal } from '../configuracion/infraestructura/sede-principal';
import { ConsultaController } from './adaptadores-entrada/consulta.controller';
import { ConsultaEventosRepository } from './aplicacion/consulta-eventos.repository';
import { ConsultarEventos } from './aplicacion/consultar-eventos';
import { ConsultaEventosPostgresRepository } from './infraestructura/consulta-eventos-postgres.repository';

@Module({
  imports: [AccesoModule],
  controllers: [ConsultaController],
  providers: [
    {
      provide: 'ResolverSedeConsulta',
      useFactory: (origen: DataSource) => async () =>
        Number(await obtenerIdSedePrincipal(origen)),
      inject: [DataSource],
    },
    {
      provide: ConsultaEventosRepository,
      useFactory: (origen: DataSource) =>
        new ConsultaEventosPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: ConsultarEventos,
      useFactory: (eventos: ConsultaEventosRepository) =>
        new ConsultarEventos(eventos),
      inject: [ConsultaEventosRepository],
    },
  ],
})
export class ConsultaModule {}

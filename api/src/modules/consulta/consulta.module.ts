import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccesoModule } from '../acceso/acceso.module';
import { obtenerIdSedePrincipal } from '../configuracion/infraestructura/sede-principal';
import { ConsultaController } from './adaptadores-entrada/consulta.controller';
import { ConsultaCobrosRepository } from './aplicacion/consulta-cobros.repository';
import { ConsultaEventosRepository } from './aplicacion/consulta-eventos.repository';
import { ConsultarCobros } from './aplicacion/consultar-cobros';
import { ConsultarEventos } from './aplicacion/consultar-eventos';
import { ConsultaCobrosPostgresRepository } from './infraestructura/consulta-cobros-postgres.repository';
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
    {
      provide: ConsultaCobrosRepository,
      useFactory: (origen: DataSource) =>
        new ConsultaCobrosPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: ConsultarCobros,
      useFactory: (cobros: ConsultaCobrosRepository) =>
        new ConsultarCobros(cobros),
      inject: [ConsultaCobrosRepository],
    },
  ],
})
export class ConsultaModule {}

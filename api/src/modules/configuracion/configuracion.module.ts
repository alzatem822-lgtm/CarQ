import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccesoModule } from '../acceso/acceso.module';
import { CuposController } from './adaptadores-entrada/cupos.controller';
import { ActualizarCupo } from './aplicacion/actualizar-cupo';
import { ConsultarCupos } from './aplicacion/consultar-cupos';
import { CupoRepository } from './aplicacion/cupo.repository';
import { CupoPostgresRepository } from './infraestructura/cupo-postgres.repository';
import { obtenerIdSedePrincipal } from './infraestructura/sede-principal';

@Module({
  imports: [AccesoModule],
  controllers: [CuposController],
  providers: [
    {
      provide: CupoRepository,
      useFactory: (origen: DataSource) => new CupoPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: ConsultarCupos,
      useFactory: (cupos: CupoRepository) => new ConsultarCupos(cupos),
      inject: [CupoRepository],
    },
    {
      provide: ActualizarCupo,
      useFactory: (cupos: CupoRepository, origen: DataSource) =>
        new ActualizarCupo(cupos, () => obtenerIdSedePrincipal(origen)),
      inject: [CupoRepository, DataSource],
    },
  ],
})
export class ConfiguracionModule {}
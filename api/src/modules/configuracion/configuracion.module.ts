import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccesoModule } from '../acceso/acceso.module';
import { CuposController } from './adaptadores-entrada/cupos.controller';
import { UmbralController } from './adaptadores-entrada/umbral.controller';
import { ActualizarCupo } from './aplicacion/actualizar-cupo';
import { ActualizarUmbral } from './aplicacion/actualizar-umbral';
import { ConsultarCupos } from './aplicacion/consultar-cupos';
import { ConsultarUmbral } from './aplicacion/consultar-umbral';
import { CupoRepository } from './aplicacion/cupo.repository';
import { ParametroRepository } from './aplicacion/parametro.repository';
import { CupoPostgresRepository } from './infraestructura/cupo-postgres.repository';
import { ParametroRepositoryPostgres } from './infraestructura/parametro.repository.postgres';
import { obtenerIdSedePrincipal } from './infraestructura/sede-principal';

@Module({
  imports: [AccesoModule],
  controllers: [CuposController, UmbralController],
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
    {
      provide: ParametroRepository,
      useFactory: (origen: DataSource) =>
        new ParametroRepositoryPostgres(origen),
      inject: [DataSource],
    },
    {
      provide: ConsultarUmbral,
      useFactory: (parametros: ParametroRepository) =>
        new ConsultarUmbral(parametros),
      inject: [ParametroRepository],
    },
    {
      provide: ActualizarUmbral,
      useFactory: (parametros: ParametroRepository) =>
        new ActualizarUmbral(parametros),
      inject: [ParametroRepository],
    },
  ],
})
export class ConfiguracionModule {}
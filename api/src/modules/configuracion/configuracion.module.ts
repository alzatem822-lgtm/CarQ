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
import { TarifasController } from './adaptadores-entrada/tarifas.controller';
import { TarifaRepository } from './aplicacion/tarifa.repository';
import { FranjaRepository } from './aplicacion/franja.repository';
import { TarifaPostgresRepository } from './infraestructura/tarifa-postgres.repository';
import { FranjaPostgresRepository } from './infraestructura/franja-postgres.repository';
import { ConsultarConfiguracionTarifas } from './aplicacion/consultar-configuracion-tarifas';
import { ActualizarTarifas } from './aplicacion/actualizar-tarifas';
import { ActualizarFranja } from './aplicacion/actualizar-franja';

@Module({
  imports: [AccesoModule],
  controllers: [CuposController, UmbralController, TarifasController],
  providers: [
    { provide: 'ResolverSedeConfiguracion', useFactory: (db: DataSource) => () => obtenerIdSedePrincipal(db), inject: [DataSource] },
    { provide: TarifaRepository, useFactory: (db: DataSource) => new TarifaPostgresRepository(db), inject: [DataSource] },
    { provide: FranjaRepository, useFactory: (db: DataSource) => new FranjaPostgresRepository(db), inject: [DataSource] },
    { provide: ConsultarConfiguracionTarifas, useFactory: (tarifas: TarifaRepository, franja: FranjaRepository) => new ConsultarConfiguracionTarifas(tarifas, franja), inject: [TarifaRepository, FranjaRepository] },
    { provide: ActualizarTarifas, useFactory: (tarifas: TarifaRepository) => new ActualizarTarifas(tarifas), inject: [TarifaRepository] },
    { provide: ActualizarFranja, useFactory: (franja: FranjaRepository) => new ActualizarFranja(franja), inject: [FranjaRepository] },
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

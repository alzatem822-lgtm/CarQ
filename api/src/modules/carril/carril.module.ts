import { Module } from '@nestjs/common';
import { ConsultarEstadoCarril } from './aplicacion/consultar-estado-carril';
import { EstadoCarrilController } from './adaptadores-entrada/estado-carril.controller';
import { DataSource } from 'typeorm';
import { ConfiguracionSistema } from '../../compartido/configuracion/configuracion-sistema';
import { BarreraCarril } from './aplicacion/barrera-carril';
import { SensorPresencia } from './aplicacion/sensor-presencia';
import { crearBarreraCarril } from './infraestructura/fabrica-barrera-carril';
import { crearSensorPresencia } from './infraestructura/fabrica-sensor-presencia';
import { AccesoModule } from '../acceso/acceso.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { CupoRepository } from '../configuracion/aplicacion/cupo.repository';
import { obtenerIdSedePrincipal } from '../configuracion/infraestructura/sede-principal';
import { OcupacionController } from './adaptadores-entrada/ocupacion.controller';
import { ConsultarOcupacion } from './aplicacion/consultar-ocupacion';
import { EstadoCarrilStore } from './aplicacion/estado-carril.store';
import { EstanciaRepository } from './aplicacion/estancia.repository';
import { EventoRepository } from './aplicacion/evento.repository';
import { EstadoCarrilEnMemoriaStore } from './infraestructura/estado-carril-en-memoria.store';
import { EstanciaPostgresRepository } from './infraestructura/estancia-postgres.repository';
import { EventoPostgresRepository } from './infraestructura/evento-postgres.repository';

@Module({
  imports: [ConfiguracionModule, AccesoModule],
  controllers: [OcupacionController, EstadoCarrilController],
  providers: [
    {
      provide: ConsultarEstadoCarril,
      useFactory: (estado: EstadoCarrilStore) =>
        new ConsultarEstadoCarril(estado),
      inject: [EstadoCarrilStore],
    },
    {
      provide: SensorPresencia,
      useFactory: (config: ConfiguracionSistema, estado: EstadoCarrilStore) =>
        crearSensorPresencia(config.obtener('FUENTE_SENSOR'), estado),
      inject: [ConfiguracionSistema, EstadoCarrilStore],
    },
    {
      provide: BarreraCarril,
      useFactory: (config: ConfiguracionSistema, estado: EstadoCarrilStore) =>
        crearBarreraCarril(config.obtener('CONTROLADOR_BARRERA'), estado),
      inject: [ConfiguracionSistema, EstadoCarrilStore],
    },
    {
      provide: 'ResolverSedeCarril',
      useFactory: (origen: DataSource) => async () =>
        Number(await obtenerIdSedePrincipal(origen)),
      inject: [DataSource],
    },
    {
      provide: ConsultarOcupacion,
      useFactory: (cupos: CupoRepository, estancias: EstanciaRepository) =>
        new ConsultarOcupacion(cupos, estancias),
      inject: [CupoRepository, EstanciaRepository],
    },
    { provide: EstadoCarrilStore, useClass: EstadoCarrilEnMemoriaStore },
    {
      provide: EstanciaRepository,
      useFactory: (origen: DataSource) =>
        new EstanciaPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: EventoRepository,
      useFactory: (origen: DataSource) => new EventoPostgresRepository(origen),
      inject: [DataSource],
    },
  ],
  exports: [
    EstadoCarrilStore,
    ConsultarOcupacion,
    SensorPresencia,
    BarreraCarril,
  ],
})
export class CarrilModule {}

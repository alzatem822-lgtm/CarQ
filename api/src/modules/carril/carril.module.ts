import { SalidaController } from './adaptadores-entrada/salida.controller';
import { ConfirmarLecturaManual } from './aplicacion/confirmar-lectura-manual';
import { LectorManual } from '../vehiculos/infraestructura/lector-manual';
import type { Redis } from 'ioredis';
import { CLIENTE_REDIS } from '../../compartido/redis/modulo-redis';
import { PaseVigenteRepository } from '../cobros/aplicacion/pase-vigente.repository';
import { PaseVigenteRedisRepository } from '../cobros/infraestructura/pase-vigente-redis.repository';
import { ProcesarSalida } from './aplicacion/procesar-salida';
import { TransaccionSalida } from './aplicacion/transaccion-salida';
import { TransaccionSalidaPostgres } from './infraestructura/transaccion-salida-postgres';
import { Module } from '@nestjs/common';
import { Reloj } from '../../compartido/reloj/reloj';
import { RelojSistema } from '../../compartido/reloj/reloj-sistema';
import { DiaOperativo } from '../../compartido/tiempo/dia-operativo';
import { ResolverFranja } from '../configuracion/dominio/resolver-franja';
import { VehiculosModule } from '../vehiculos/vehiculos.module';
import { LectorPlaca } from '../vehiculos/aplicacion/lector-placa';
import { ProcesarIngreso } from './aplicacion/procesar-ingreso';
import { TransaccionIngreso } from './aplicacion/transaccion-ingreso';
import { TransaccionIngresoPostgres } from './infraestructura/transaccion-ingreso-postgres';
import { IngresoController } from './adaptadores-entrada/ingreso.controller';
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
  imports: [ConfiguracionModule, AccesoModule, VehiculosModule],
  controllers: [
    OcupacionController,
    EstadoCarrilController,
    IngresoController,
    SalidaController,
  ],
  providers: [
    {
      provide: ConfirmarLecturaManual,
      useFactory: (ingreso: ProcesarIngreso, salida: ProcesarSalida) =>
        new ConfirmarLecturaManual(new LectorManual(), ingreso, salida),
      inject: [ProcesarIngreso, ProcesarSalida],
    },
    {
      provide: PaseVigenteRepository,
      useFactory: (redis: Redis, reloj: Reloj) =>
        new PaseVigenteRedisRepository(redis, reloj),
      inject: [CLIENTE_REDIS, Reloj],
    },
    {
      provide: TransaccionSalida,
      useFactory: (
        origen: DataSource,
        config: ConfiguracionSistema,
        pases: PaseVigenteRepository,
      ) =>
        new TransaccionSalidaPostgres(
          origen,
          new DiaOperativo(
            config.obtener('ZONA_HORARIA'),
            config.obtener('INICIO_DIA_OPERATIVO'),
          ),
          new ResolverFranja(config.obtener('ZONA_HORARIA')),
          pases,
        ),
      inject: [DataSource, ConfiguracionSistema, PaseVigenteRepository],
    },
    {
      provide: ProcesarSalida,
      useFactory: (
        lector: LectorPlaca,
        reloj: Reloj,
        transaccion: TransaccionSalida,
        estado: EstadoCarrilStore,
        barrera: BarreraCarril,
      ) => new ProcesarSalida(lector, reloj, transaccion, estado, barrera),
      inject: [
        LectorPlaca,
        Reloj,
        TransaccionSalida,
        EstadoCarrilStore,
        BarreraCarril,
      ],
    },
    { provide: Reloj, useClass: RelojSistema },
    {
      provide: TransaccionIngreso,
      useFactory: (origen: DataSource, config: ConfiguracionSistema) =>
        new TransaccionIngresoPostgres(
          origen,
          new DiaOperativo(
            config.obtener('ZONA_HORARIA'),
            config.obtener('INICIO_DIA_OPERATIVO'),
          ),
          new ResolverFranja(config.obtener('ZONA_HORARIA')),
        ),
      inject: [DataSource, ConfiguracionSistema],
    },
    {
      provide: ProcesarIngreso,
      useFactory: (
        lector: LectorPlaca,
        reloj: Reloj,
        transaccion: TransaccionIngreso,
        estado: EstadoCarrilStore,
        barrera: BarreraCarril,
      ) => new ProcesarIngreso(lector, reloj, transaccion, estado, barrera),
      inject: [
        LectorPlaca,
        Reloj,
        TransaccionIngreso,
        EstadoCarrilStore,
        BarreraCarril,
      ],
    },
    {
      provide: 'ResolverCarrilIngreso',
      useFactory: (origen: DataSource) => async () => {
        const [fila]: { sede_id: number; id: number }[] = await origen.query(
          'SELECT id, sede_id FROM carril WHERE sede_id = (SELECT id FROM sede ORDER BY id LIMIT 1) ORDER BY id LIMIT 1',
        );
        if (!fila)
          throw new Error('No hay carril configurado; falta ejecutar el seed');
        return { sedeId: fila.sede_id, carrilId: fila.id };
      },
      inject: [DataSource],
    },
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

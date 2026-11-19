import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';
import { CLIENTE_REDIS } from '../../compartido/redis/modulo-redis';
import { ConfiguracionSistema } from '../../compartido/configuracion/configuracion-sistema';
import { Reloj } from '../../compartido/reloj/reloj';
import { RelojSistema } from '../../compartido/reloj/reloj-sistema';
import { AccesoModule } from '../acceso/acceso.module';
import { obtenerIdSedePrincipal } from '../configuracion/infraestructura/sede-principal';
import { DiaOperativo } from '../../compartido/tiempo/dia-operativo';
import { FranjaRepository } from '../configuracion/aplicacion/franja.repository';
import { TarifaRepository } from '../configuracion/aplicacion/tarifa.repository';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ResolverFranja } from '../configuracion/dominio/resolver-franja';
import { CobroRepository } from './aplicacion/cobro.repository';
import { PagoRepository } from './aplicacion/pago.repository';
import { ConsultarPaseVigente } from './aplicacion/consultar-pase-vigente';
import { GuardarPaseDePago } from './aplicacion/guardar-pase-de-pago';
import { PaseVigenteRepository } from './aplicacion/pase-vigente.repository';
import { PaseVigenteRedisRepository } from './infraestructura/pase-vigente-redis.repository';
import { RegistrarPagoEfectivo } from './aplicacion/registrar-pago-efectivo';
import { TransaccionPago } from './aplicacion/transaccion-pago';
import { PagoPostgresRepository } from './infraestructura/pago-postgres.repository';
import { TransaccionPagoPostgres } from './infraestructura/transaccion-pago-postgres';
import { BuscarCobroPendientePorPlaca } from './aplicacion/buscar-cobro-pendiente-por-placa';
import {
  CajaController,
  SEDE_CAJA,
} from './adaptadores-entrada/caja.controller';
import { GenerarCobro } from './aplicacion/generar-cobro';
import { RegistroEstrategiasTarifa } from './dominio/estrategia-tarifa';
import { tarifaCarro, tarifaMoto } from './dominio/tarifa-por-franja';
import { CobroPostgresRepository } from './infraestructura/cobro-postgres.repository';

@Module({
  imports: [AccesoModule, ConfiguracionModule],
  controllers: [CajaController],
  providers: [
    {
      provide: PaseVigenteRepository,
      useFactory: (redis: Redis, reloj: Reloj) =>
        new PaseVigenteRedisRepository(redis, reloj),
      inject: [CLIENTE_REDIS, Reloj],
    },
    {
      provide: GuardarPaseDePago,
      useFactory: (
        pases: PaseVigenteRepository,
        dias: DiaOperativo,
        reloj: Reloj,
      ) => new GuardarPaseDePago(pases, dias, reloj),
      inject: [PaseVigenteRepository, DiaOperativo, Reloj],
    },
    {
      provide: ConsultarPaseVigente,
      useFactory: (
        pases: PaseVigenteRepository,
        cobros: CobroRepository,
        dias: DiaOperativo,
        reloj: Reloj,
      ) => new ConsultarPaseVigente(pases, cobros, dias, reloj),
      inject: [PaseVigenteRepository, CobroRepository, DiaOperativo, Reloj],
    },
    {
      provide: PagoRepository,
      useFactory: (origen: DataSource) => new PagoPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: TransaccionPago,
      useFactory: (origen: DataSource) => new TransaccionPagoPostgres(origen),
      inject: [DataSource],
    },
    {
      provide: RegistrarPagoEfectivo,
      useFactory: (
        transaccion: TransaccionPago,
        reloj: Reloj,
        pagos: PagoRepository,
        guardarPase: GuardarPaseDePago,
      ) => new RegistrarPagoEfectivo(transaccion, reloj, pagos, guardarPase),
      inject: [TransaccionPago, Reloj, PagoRepository, GuardarPaseDePago],
    },
    { provide: Reloj, useClass: RelojSistema },
    {
      provide: SEDE_CAJA,
      useFactory: (origen: DataSource) => async () =>
        Number(await obtenerIdSedePrincipal(origen)),
      inject: [DataSource],
    },
    {
      provide: BuscarCobroPendientePorPlaca,
      useFactory: (cobros: CobroRepository, dias: DiaOperativo, reloj: Reloj) =>
        new BuscarCobroPendientePorPlaca(cobros, dias, reloj),
      inject: [CobroRepository, DiaOperativo, Reloj],
    },
    {
      provide: DiaOperativo,
      useFactory: (config: ConfiguracionSistema) =>
        new DiaOperativo(
          config.obtener('ZONA_HORARIA'),
          config.obtener('INICIO_DIA_OPERATIVO'),
        ),
      inject: [ConfiguracionSistema],
    },
    {
      provide: ResolverFranja,
      useFactory: (config: ConfiguracionSistema) =>
        new ResolverFranja(config.obtener('ZONA_HORARIA')),
      inject: [ConfiguracionSistema],
    },
    {
      provide: RegistroEstrategiasTarifa,
      useFactory: () =>
        new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]),
    },
    {
      provide: CobroRepository,
      useFactory: (origen: DataSource) => new CobroPostgresRepository(origen),
      inject: [DataSource],
    },
    {
      provide: GenerarCobro,
      useFactory: (
        cobros: CobroRepository,
        franjas: FranjaRepository,
        tarifas: TarifaRepository,
        dias: DiaOperativo,
        resolver: ResolverFranja,
        estrategias: RegistroEstrategiasTarifa,
      ) =>
        new GenerarCobro(cobros, franjas, tarifas, dias, resolver, estrategias),
      inject: [
        CobroRepository,
        FranjaRepository,
        TarifaRepository,
        DiaOperativo,
        ResolverFranja,
        RegistroEstrategiasTarifa,
      ],
    },
  ],
  exports: [GenerarCobro, DiaOperativo, CobroRepository, ConsultarPaseVigente],
})
export class CobrosModule {}

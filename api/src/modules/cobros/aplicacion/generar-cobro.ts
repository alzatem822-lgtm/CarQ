import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { FranjaRepository } from '../../configuracion/aplicacion/franja.repository';
import { TarifaRepository } from '../../configuracion/aplicacion/tarifa.repository';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cobro } from '../dominio/cobro';
import { RegistroEstrategiasTarifa } from '../dominio/estrategia-tarifa';
import { CobroRepository } from './cobro.repository';

interface SolicitudCobro {
  placa: Placa;
  tipoVehiculo: TipoVehiculo;
  sedeId: number;
  ingresoEn: Date;
}

export class GenerarCobro {
  constructor(
    private readonly cobros: CobroRepository,
    private readonly franjas: FranjaRepository,
    private readonly tarifas: TarifaRepository,
    private readonly dias: DiaOperativo,
    private readonly horario: ResolverFranja,
    private readonly estrategias: RegistroEstrategiasTarifa,
  ) {}

  async ejecutar({
    placa,
    tipoVehiculo,
    sedeId,
    ingresoEn,
  }: SolicitudCobro): Promise<Cobro | null> {
    const diaOperativo = this.dias.de(ingresoEn);
    const existente = await this.cobros.buscarPorPlacaYDia(
      placa,
      sedeId,
      diaOperativo,
    );
    if (existente) return existente;

    const [configuracion, tarifas] = await Promise.all([
      this.franjas.obtener(String(sedeId)),
      this.tarifas.obtenerTodas(String(sedeId)),
    ]);
    const franja = this.horario.resolver(ingresoEn, configuracion);
    const tarifaAplicada = this.estrategias.resolver(
      tipoVehiculo,
      franja,
      tarifas,
    );
    if (tarifaAplicada === 0) return null;

    return this.cobros.guardar(
      Cobro.crear({
        placa,
        tipoVehiculo,
        sedeId,
        diaOperativo,
        franja,
        tarifaAplicada,
      }),
    );
  }
}

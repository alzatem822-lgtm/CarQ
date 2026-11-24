import type { CodigoEstadoCobro } from '../../cobros/dominio/estado-cobro';
import type { TipoFranja } from '../../configuracion/dominio/franja';
import type { Placa } from '../../vehiculos/dominio/placa';
import type { PaginaConsulta, PaginacionConsulta } from './pagina-consulta';

export interface FiltrosConsultaCobros extends PaginacionConsulta {
  readonly sedeId: number;
  readonly placa?: Placa;
  /** Límites inclusivos del día operativo en formato YYYY-MM-DD. */
  readonly diaDesde?: string;
  readonly diaHasta?: string;
  readonly estado?: CodigoEstadoCobro;
}

export interface CobroConsultado {
  readonly id: number;
  readonly placa: string;
  readonly tipoVehiculo: string;
  readonly diaOperativo: string;
  readonly franja: TipoFranja;
  readonly tarifaAplicada: number;
  readonly estado: CodigoEstadoCobro;
}

export abstract class ConsultaCobrosRepository {
  abstract consultar(
    filtros: FiltrosConsultaCobros,
  ): Promise<PaginaConsulta<CobroConsultado>>;
}

import type {
  ResultadoEvento,
  SentidoEvento,
} from '../../carril/dominio/evento';
import type { Placa } from '../../vehiculos/dominio/placa';
import type { PaginaConsulta, PaginacionConsulta } from './pagina-consulta';

export interface FiltrosConsultaEventos extends PaginacionConsulta {
  readonly sedeId: number;
  readonly placa?: Placa;
  readonly desde?: Date;
  readonly hastaExclusivo?: Date;
  readonly resultado?: ResultadoEvento;
}

export interface EventoConsultado {
  readonly id: number;
  readonly carrilId: number;
  readonly placa: string | null;
  readonly sentido: SentidoEvento;
  readonly resultado: ResultadoEvento;
  readonly motivo: string;
  readonly ocurridoEn: Date;
}

export abstract class ConsultaEventosRepository {
  abstract consultar(
    filtros: FiltrosConsultaEventos,
  ): Promise<PaginaConsulta<EventoConsultado>>;
}

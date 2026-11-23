import {
  RESULTADOS_EVENTO,
  type ResultadoEvento,
} from '../../carril/dominio/evento';
import type { ConsultaEventosRepository } from './consulta-eventos.repository';
import {
  filtroInvalido,
  type FiltrosConsulta,
  validarFechaCalendario,
  validarPaginacion,
  validarPlaca,
} from './validar-filtros-consulta';

export interface FiltrosEventos extends FiltrosConsulta {
  readonly resultado?: ResultadoEvento;
}

function validarInstante(valor?: string): Date | undefined {
  if (valor === undefined) return undefined;
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      valor,
    )
  ) {
    filtroInvalido(
      'La fecha del evento debe ser un instante ISO 8601 con zona horaria.',
    );
  }
  validarFechaCalendario(valor.slice(0, 10));
  return new Date(valor);
}

export class ConsultarEventos {
  constructor(private readonly eventos: ConsultaEventosRepository) {}

  ejecutar(sedeId: number, filtros: FiltrosEventos) {
    const desde = validarInstante(filtros.desde);
    const hastaExclusivo = validarInstante(filtros.hasta);
    if (desde && hastaExclusivo && desde >= hastaExclusivo) {
      filtroInvalido('La fecha inicial debe ser anterior a la fecha final.');
    }
    if (
      filtros.resultado !== undefined &&
      !RESULTADOS_EVENTO.includes(filtros.resultado)
    ) {
      filtroInvalido('El resultado del evento no es válido.');
    }

    return this.eventos.consultar({
      sedeId,
      placa: validarPlaca(filtros.placa),
      desde,
      hastaExclusivo,
      resultado: filtros.resultado,
      ...validarPaginacion(filtros),
    });
  }
}

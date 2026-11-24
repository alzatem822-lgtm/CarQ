import {
  ESTADOS_COBRO,
  type CodigoEstadoCobro,
} from '../../cobros/dominio/estado-cobro';
import type { ConsultaCobrosRepository } from './consulta-cobros.repository';
import {
  filtroInvalido,
  type FiltrosConsulta,
  validarFechaCalendario,
  validarPaginacion,
  validarPlaca,
} from './validar-filtros-consulta';

export interface FiltrosCobros extends FiltrosConsulta {
  readonly estado?: CodigoEstadoCobro;
}

export class ConsultarCobros {
  constructor(private readonly cobros: ConsultaCobrosRepository) {}

  ejecutar(sedeId: number, filtros: FiltrosCobros) {
    const { desde, hasta, estado } = filtros;
    if (desde !== undefined) validarFechaCalendario(desde);
    if (hasta !== undefined) validarFechaCalendario(hasta);
    if (desde && hasta && desde > hasta) {
      filtroInvalido(
        'La fecha inicial debe ser anterior o igual a la fecha final.',
      );
    }
    if (estado !== undefined && !ESTADOS_COBRO.includes(estado)) {
      filtroInvalido('El estado del cobro no es válido.');
    }

    return this.cobros.consultar({
      sedeId,
      placa: validarPlaca(filtros.placa),
      diaDesde: desde,
      diaHasta: hasta,
      estado,
      ...validarPaginacion(filtros),
    });
  }
}

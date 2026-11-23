import type { CodigoEstadoCobro } from '../../cobros/dominio/estado-cobro';

export interface ResultadoDecisionSalida {
  readonly autoriza: boolean;
  readonly motivo: string;
}

export function decidirSalida(
  estadoCobro: CodigoEstadoCobro | null,
): ResultadoDecisionSalida {
  switch (estadoCobro) {
    case 'PENDIENTE':
      return { autoriza: false, motivo: 'Cobro pendiente, pasar por caja' };
    case 'ANULADO':
      return { autoriza: false, motivo: 'Cobro anulado, requiere revisión' };
    case 'PAGADO':
      return { autoriza: true, motivo: 'Cobro pagado' };
    case null:
      return { autoriza: true, motivo: 'Sin cobro exigible' };
  }
}

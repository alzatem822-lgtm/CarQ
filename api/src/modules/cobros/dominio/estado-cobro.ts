import { ErrorDominio } from '../../../compartido/errores/error-dominio';

export const ESTADOS_COBRO = ['PENDIENTE', 'PAGADO', 'ANULADO'] as const;
export type CodigoEstadoCobro = (typeof ESTADOS_COBRO)[number];

interface EstadoCobro {
  transicionar(destino: CodigoEstadoCobro): CodigoEstadoCobro;
}

function transicionInvalida(): never {
  throw new ErrorDominio(
    'ESTADO_COBRO_INVALIDO',
    'La transición solicitada requiere un cobro pendiente.',
  );
}

const terminal: EstadoCobro = { transicionar: transicionInvalida };
const estados: Record<CodigoEstadoCobro, EstadoCobro> = {
  PENDIENTE: {
    transicionar(destino) {
      return destino === 'PAGADO' || destino === 'ANULADO'
        ? destino
        : transicionInvalida();
    },
  },
  PAGADO: terminal,
  ANULADO: terminal,
};

export function estadoDeCobro(codigo: CodigoEstadoCobro): EstadoCobro {
  return estados[codigo];
}

import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Placa } from '../../vehiculos/dominio/placa';
import type { PaginacionConsulta } from './pagina-consulta';

export interface FiltrosConsulta {
  readonly placa?: string;
  readonly desde?: string;
  readonly hasta?: string;
  readonly pagina?: number;
  readonly tamanioPagina?: number;
}

export function filtroInvalido(motivo: string): never {
  throw new ErrorDominio('FILTRO_CONSULTA_INVALIDO', motivo);
}

export function validarPaginacion({
  pagina = 1,
  tamanioPagina = 20,
}: FiltrosConsulta): PaginacionConsulta {
  if (!Number.isSafeInteger(pagina) || pagina < 1) {
    filtroInvalido('La página debe ser un entero positivo.');
  }
  if (
    !Number.isInteger(tamanioPagina) ||
    tamanioPagina < 1 ||
    tamanioPagina > 100
  ) {
    filtroInvalido('El tamaño de página debe estar entre 1 y 100.');
  }
  if (!Number.isSafeInteger((pagina - 1) * tamanioPagina)) {
    filtroInvalido('La página solicitada está fuera de rango.');
  }
  return { pagina, tamanioPagina };
}

export function validarPlaca(placa?: string): Placa | undefined {
  return placa === undefined ? undefined : Placa.crear(placa.trim());
}

export function validarFechaCalendario(fecha: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith('0000')) {
    filtroInvalido('La fecha debe tener formato AAAA-MM-DD.');
  }
  const instante = new Date(fecha);
  if (
    !Number.isFinite(instante.getTime()) ||
    instante.toISOString().slice(0, 10) !== fecha
  ) {
    filtroInvalido('La fecha debe existir en el calendario.');
  }
}

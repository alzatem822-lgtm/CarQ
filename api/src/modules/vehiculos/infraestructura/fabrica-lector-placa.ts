import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { LectorPlaca } from '../aplicacion/lector-placa';
import { LectorSimulado } from './lector-simulado';

export type TipoLector = 'simulado' | 'manual' | 'http';

/**
 * Elige la implementación de LectorPlaca según LECTOR_PLACAS.
 * `manual` y `http` son valores válidos del entorno, pero su
 * implementación llega en el Sprint 3: hasta entonces fallan
 * con LECTOR_NO_DISPONIBLE.
 */
export function crearLectorPlaca(tipo: TipoLector): LectorPlaca {
  switch (tipo) {
    case 'simulado':
      return new LectorSimulado();
    case 'manual':
    case 'http':
      throw new ErrorDominio(
        'LECTOR_NO_DISPONIBLE',
        `El lector de placas "${tipo}" aún no está disponible`,
      );
  }
}
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { LectorPlaca } from '../aplicacion/lector-placa';
import { LectorSimulado } from './lector-simulado';
import { LectorManual } from './lector-manual';

export type TipoLector = 'simulado' | 'manual' | 'http';

/**
 * Elige la implementación de LectorPlaca según LECTOR_PLACAS.
 * El lector HTTP permanece no disponible hasta integrar el servicio OCR.
 */
export function crearLectorPlaca(tipo: TipoLector): LectorPlaca {
  switch (tipo) {
    case 'simulado':
      return new LectorSimulado();
    case 'manual':
      return new LectorManual();
    case 'http':
      throw new ErrorDominio(
        'LECTOR_NO_DISPONIBLE',
        `El lector de placas "${tipo}" aún no está disponible`,
      );
  }
}

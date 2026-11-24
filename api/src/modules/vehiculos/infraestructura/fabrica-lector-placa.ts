import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { LectorPlaca } from '../aplicacion/lector-placa';
import { LectorSimulado } from './lector-simulado';
import { LectorManual } from './lector-manual';
import { LectorOcr } from './lector-ocr';

export type TipoLector = 'simulado' | 'manual' | 'http';

/**
 * Elige la implementación de LectorPlaca según LECTOR_PLACAS.
 */
export function crearLectorPlaca(
  tipo: TipoLector,
  urlLpr?: string,
): LectorPlaca {
  switch (tipo) {
    case 'simulado':
      return new LectorSimulado();
    case 'manual':
      return new LectorManual();
    case 'http':
      if (!urlLpr)
        throw new ErrorDominio(
          'URL_LPR_REQUERIDA',
          'El lector OCR requiere la URL del servicio LPR',
        );
      return new LectorOcr(urlLpr);
  }
}

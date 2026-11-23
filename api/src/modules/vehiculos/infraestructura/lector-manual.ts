import { LectorPlaca, SolicitudLectura } from '../aplicacion/lector-placa';
import { LecturaPlaca } from '../dominio/lectura-placa';
import { Placa } from '../dominio/placa';
import { PlacaInvalidaError } from '../dominio/placa-invalida.error';

/** Lectura digitada: la confirmación humana tiene confianza 1; una placa inválida no continúa. */
export class LectorManual extends LectorPlaca {
  leer(solicitud: SolicitudLectura): Promise<LecturaPlaca> {
    let placa: Placa | null = null;
    if (solicitud.placa !== undefined) {
      try {
        placa = Placa.crear(solicitud.placa.replace(/[\s-]/g, ''));
      } catch (error) {
        if (!(error instanceof PlacaInvalidaError)) throw error;
      }
    }
    return Promise.resolve({
      placa,
      confianza: placa ? 1 : 0,
      origen: 'MANUAL',
    });
  }
}

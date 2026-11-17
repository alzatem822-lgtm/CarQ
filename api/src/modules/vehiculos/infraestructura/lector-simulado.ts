import { Placa } from '../dominio/placa';
import { PlacaInvalidaError } from '../dominio/placa-invalida.error';
import { LecturaPlaca } from '../dominio/lectura-placa';
import { LectorPlaca, SolicitudLectura } from '../aplicacion/lector-placa';

/**
 * Lector de placas simulado: devuelve la placa y la confianza que
 * indica la petición, con origen SIMULADO. Normaliza la placa
 * (mayúsculas, sin espacios ni guiones) antes de validarla.
 * Si la placa falta o su formato es inválido, devuelve placa nula
 * para que el carril pase a lectura manual.
 */
export class LectorSimulado extends LectorPlaca {
  leer(solicitud: SolicitudLectura): Promise<LecturaPlaca> {
    const confianza = solicitud.confianza ?? 0;
    return Promise.resolve({
      placa: this.interpretarPlaca(solicitud.placa),
      confianza,
      origen: 'SIMULADO',
    });
  }

  private interpretarPlaca(texto?: string): Placa | null {
    if (texto === undefined) return null;
    const normalizada = texto.replace(/[\s-]/g, '');
    try {
      return Placa.crear(normalizada);
    } catch (error) {
      if (error instanceof PlacaInvalidaError) return null;
      throw error;
    }
  }
}
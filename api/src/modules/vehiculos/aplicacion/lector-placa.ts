import { LecturaPlaca } from '../dominio/lectura-placa';

/**
 * Datos con los que se pide una lectura. El simulador usa `placa` y
 * `confianza`; los lectores reales (Sprint 3) usarán `imagen`.
 */
export type SolicitudLectura = {
  readonly placa?: string;
  readonly confianza?: number;
  readonly imagen?: Buffer;
};

/**
 * Contrato único para leer placas. El carril depende solo de esta
 * abstracción, sin saber si la lectura es simulada, manual u OCR.
 * Toda implementación devuelve placa (o nula) y confianza.
 */
export abstract class LectorPlaca {
  abstract leer(solicitud: SolicitudLectura): Promise<LecturaPlaca>;
}
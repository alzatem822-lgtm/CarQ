import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import type { LecturaPlaca } from './lectura-placa';

/** Determina si una lectura necesita revisión antes de continuar por el carril. */
export class RequiereValidacionManual {
  /** Una placa inválida se recibe como nula desde el lector. */
  evaluar(lectura: LecturaPlaca, umbral: UmbralConfianza): boolean {
    return (
      lectura.placa === null ||
      !Number.isFinite(lectura.confianza) ||
      lectura.confianza < 0 ||
      lectura.confianza > 1 ||
      lectura.confianza < umbral.valor
    );
  }
}

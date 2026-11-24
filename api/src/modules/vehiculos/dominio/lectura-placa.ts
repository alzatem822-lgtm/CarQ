import { Placa } from './placa';

export const ORIGENES_LECTURA = ['SIMULADO', 'MANUAL', 'OCR'] as const;

export type OrigenLectura = (typeof ORIGENES_LECTURA)[number];

/**
 * Resultado de leer una placa. La placa es nula cuando el lector
 * no logra detectar ninguna; la confianza va de 0 a 1.
 */
export type LecturaPlaca = {
  readonly placa: Placa | null;
  readonly confianza: number;
  readonly origen: OrigenLectura;
};
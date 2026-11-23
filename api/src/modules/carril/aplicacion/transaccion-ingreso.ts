import type { LecturaPlaca } from '../../vehiculos/dominio/lectura-placa';
import type { ResultadoEvento } from '../dominio/evento';

export interface SolicitudIngreso {
  sedeId: number;
  carrilId: number;
  lectura: LecturaPlaca;
  ocurridoEn: Date;
}

export interface ResultadoIngreso {
  resultado: ResultadoEvento;
  motivo: string;
}

/** Confirma admisión y evento como unidad, o registra únicamente el rechazo. */
export abstract class TransaccionIngreso {
  abstract ejecutar(solicitud: SolicitudIngreso): Promise<ResultadoIngreso>;
}

import type { LecturaPlaca } from '../../vehiculos/dominio/lectura-placa';
import type { ResultadoEvento } from '../dominio/evento';

export interface SolicitudSalida {
  sedeId: number;
  carrilId: number;
  lectura: LecturaPlaca;
  ocurridoEn: Date;
  operador?: string;
}

export interface ResultadoSalida {
  resultado: ResultadoEvento;
  motivo: string;
}

/** Confirma cierre y evento juntos; un rechazo conserva el nuevo cobro exigible. */
export abstract class TransaccionSalida {
  abstract ejecutar(solicitud: SolicitudSalida): Promise<ResultadoSalida>;
}

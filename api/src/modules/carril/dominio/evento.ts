import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { OrigenLectura } from '../../vehiculos/dominio/lectura-placa';
import { Placa } from '../../vehiculos/dominio/placa';

export const SENTIDOS_EVENTO = ['ENTRADA', 'SALIDA'] as const;
export type SentidoEvento = (typeof SENTIDOS_EVENTO)[number];

export const RESULTADOS_EVENTO = [
  'AUTORIZADO',
  'RECHAZADO',
  'REQUIERE_LECTURA_MANUAL',
] as const;
export type ResultadoEvento = (typeof RESULTADOS_EVENTO)[number];

export type DatosEvento = {
  readonly sedeId: string;
  readonly carrilId: string;
  readonly placa: Placa | null;
  readonly sentido: SentidoEvento;
  readonly resultado: ResultadoEvento;
  readonly motivo: string;
  readonly confianza: number | null;
  readonly origen: OrigenLectura;
  readonly lecturaManual: boolean;
  readonly ocurridoEn: Date;
};

/**
 * Registro de lo que pasó en el carril: autorizaciones y también rechazos.
 * La placa es nula cuando el lector no detectó ninguna; la confianza, si
 * existe, va de 0 a 1.
 */
export class Evento {
  readonly sedeId: string;
  readonly carrilId: string;
  readonly placa: Placa | null;
  readonly sentido: SentidoEvento;
  readonly resultado: ResultadoEvento;
  readonly motivo: string;
  readonly confianza: number | null;
  readonly origen: OrigenLectura;
  readonly lecturaManual: boolean;
  readonly ocurridoEn: Date;

  private constructor(datos: DatosEvento) {
    this.sedeId = datos.sedeId;
    this.carrilId = datos.carrilId;
    this.placa = datos.placa;
    this.sentido = datos.sentido;
    this.resultado = datos.resultado;
    this.motivo = datos.motivo;
    this.confianza = datos.confianza;
    this.origen = datos.origen;
    this.lecturaManual = datos.lecturaManual;
    this.ocurridoEn = datos.ocurridoEn;
  }

  static crear(datos: DatosEvento): Evento {
    if (datos.motivo.trim() === '') {
      throw new ErrorDominio('EVENTO_MOTIVO_INVALIDO', 'El evento requiere un motivo');
    }
    if (
      datos.confianza !== null &&
      (datos.confianza < 0 || datos.confianza > 1)
    ) {
      throw new ErrorDominio(
        'EVENTO_CONFIANZA_INVALIDA',
        'La confianza del evento debe estar entre 0 y 1',
      );
    }
    return new Evento(datos);
  }
}
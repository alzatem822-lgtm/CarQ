import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { LectorPlaca } from '../../vehiculos/aplicacion/lector-placa';
import { SENTIDOS_EVENTO, type SentidoEvento } from '../dominio/evento';
import { ProcesarIngreso } from './procesar-ingreso';
import { ProcesarSalida } from './procesar-salida';
import type { ResultadoIngreso } from './transaccion-ingreso';

export interface SolicitudConfirmacionManual {
  readonly sedeId: number;
  readonly carrilId: number;
  readonly sentido: SentidoEvento;
  readonly placa: string;
  readonly operador: string;
}

/** El lector inyectado es el manual, aunque las capturas utilicen OCR o simulación. */
export class ConfirmarLecturaManual {
  constructor(
    private readonly lectorManual: LectorPlaca,
    private readonly ingreso: ProcesarIngreso,
    private readonly salida: ProcesarSalida,
  ) {}

  async ejecutar(
    solicitud: SolicitudConfirmacionManual,
  ): Promise<ResultadoIngreso> {
    if (!solicitud.operador?.trim())
      throw new ErrorDominio(
        'OPERADOR_REQUERIDO',
        'La confirmación manual requiere un operador',
      );
    if (!SENTIDOS_EVENTO.includes(solicitud.sentido))
      throw new ErrorDominio('SENTIDO_INVALIDO', 'Selecciona entrada o salida');
    const lectura = await this.lectorManual.leer({ placa: solicitud.placa });
    if (!lectura.placa)
      throw new ErrorDominio(
        'PLACA_INVALIDA',
        'La placa confirmada no tiene un formato válido',
      );
    if (lectura.origen !== 'MANUAL' || lectura.confianza !== 1)
      throw new ErrorDominio(
        'LECTURA_MANUAL_INVALIDA',
        'La confirmación requiere una lectura manual',
      );
    const proceso =
      solicitud.sentido === 'ENTRADA' ? this.ingreso : this.salida;
    return proceso.ejecutarConLectura(
      solicitud.sedeId,
      solicitud.carrilId,
      lectura,
      solicitud.operador,
    );
  }
}

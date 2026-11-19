import { ErrorDominio } from '../../../compartido/errores/error-dominio';

export interface DatosPago {
  id: number | null;
  cobroId: number;
  referencia: string;
  monto: number;
  operador: string;
  fecha: Date;
}

export function normalizarReferenciaPago(referencia: string): string {
  const normalizada = referencia.trim();
  if (!normalizada || normalizada.length > 100) {
    throw new ErrorDominio(
      'REFERENCIA_INVALIDA',
      'La referencia debe contener entre 1 y 100 caracteres.',
    );
  }
  return normalizada;
}

export class Pago {
  private constructor(private readonly datos: Readonly<DatosPago>) {}

  static crear(datos: Omit<DatosPago, 'id'>): Pago {
    return Pago.reconstruir({ ...datos, id: null });
  }

  static reconstruir(datos: DatosPago): Pago {
    const referencia = normalizarReferenciaPago(datos.referencia);
    if (
      !Number.isSafeInteger(datos.cobroId) ||
      datos.cobroId < 1 ||
      !Number.isInteger(datos.monto) ||
      datos.monto < 1 ||
      datos.monto > 2147483647 ||
      !datos.operador.trim() ||
      !Number.isFinite(datos.fecha.getTime())
    ) {
      throw new ErrorDominio(
        'PAGO_INVALIDO',
        'Los datos del pago son inválidos.',
      );
    }
    return new Pago({ ...datos, referencia, fecha: new Date(datos.fecha) });
  }

  get id() {
    return this.datos.id;
  }
  get cobroId() {
    return this.datos.cobroId;
  }
  get referencia() {
    return this.datos.referencia;
  }
  get monto() {
    return this.datos.monto;
  }
  get operador() {
    return this.datos.operador;
  }
  get fecha() {
    return new Date(this.datos.fecha);
  }
}

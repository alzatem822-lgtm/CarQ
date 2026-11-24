import type { DataSource } from 'typeorm';
import { esUnicidad } from '../../../compartido/base-datos/restriccion-postgres';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { PagoRepository } from '../aplicacion/pago.repository';
import { Pago } from '../dominio/pago';

interface FilaPago {
  id: number;
  cobro_id: number;
  referencia: string;
  monto: number;
  operador: string;
  fecha: Date;
}

const columnas = 'id, cobro_id, referencia, monto, operador, fecha';

export class PagoPostgresRepository extends PagoRepository {
  constructor(private readonly origen: Pick<DataSource, 'query'>) {
    super();
  }

  async buscarPorReferencia(referencia: string): Promise<Pago | null> {
    const [fila]: FilaPago[] = await this.origen.query(
      `SELECT ${columnas} FROM pago WHERE referencia = $1`,
      [referencia],
    );
    return fila ? aPago(fila) : null;
  }

  async guardar(pago: Pago): Promise<Pago> {
    try {
      const [fila]: FilaPago[] = await this.origen.query(
        `INSERT INTO pago (cobro_id, referencia, monto, operador, fecha)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${columnas}`,
        [pago.cobroId, pago.referencia, pago.monto, pago.operador, pago.fecha],
      );
      return aPago(fila);
    } catch (error) {
      if (esUnicidad(error, 'uq_pago_referencia')) {
        throw new ErrorDominio(
          'PAGO_DUPLICADO',
          'Ya se utilizó la referencia de pago.',
        );
      }
      if (esUnicidad(error, 'uq_pago_cobro')) {
        throw new ErrorDominio(
          'COBRO_YA_PAGADO',
          'El cobro ya tiene un pago registrado.',
        );
      }
      throw error;
    }
  }
}

function aPago(fila: FilaPago): Pago {
  return Pago.reconstruir({
    id: fila.id,
    cobroId: fila.cobro_id,
    referencia: fila.referencia,
    monto: fila.monto,
    operador: fila.operador,
    fecha: fila.fecha,
  });
}

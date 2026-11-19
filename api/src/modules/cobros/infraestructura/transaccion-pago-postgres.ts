import type { DataSource } from 'typeorm';
import { ContextoPago, TransaccionPago } from '../aplicacion/transaccion-pago';
import { CobroPostgresRepository } from './cobro-postgres.repository';
import { PagoPostgresRepository } from './pago-postgres.repository';

export class TransaccionPagoPostgres extends TransaccionPago {
  constructor(private readonly origen: DataSource) {
    super();
  }

  ejecutar<T>(
    cobroId: number,
    sedeId: number,
    trabajo: (contexto: ContextoPago) => Promise<T>,
  ): Promise<T> {
    return this.origen.transaction(async (gestor) => {
      const cobros = new CobroPostgresRepository(gestor);
      const cobro = await cobros.bloquearPorId(cobroId, sedeId);
      return trabajo({
        cobro,
        cobros,
        pagos: new PagoPostgresRepository(gestor),
      });
    });
  }
}

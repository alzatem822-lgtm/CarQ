import { Cobro } from '../dominio/cobro';
import { CobroRepository } from './cobro.repository';
import { PagoRepository } from './pago.repository';

export interface ContextoPago {
  cobro: Cobro | null;
  cobros: CobroRepository;
  pagos: PagoRepository;
}

export abstract class TransaccionPago {
  abstract ejecutar<T>(
    cobroId: number,
    sedeId: number,
    trabajo: (contexto: ContextoPago) => Promise<T>,
  ): Promise<T>;
}

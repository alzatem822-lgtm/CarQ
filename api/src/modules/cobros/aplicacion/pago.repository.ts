import { Pago } from '../dominio/pago';

export abstract class PagoRepository {
  abstract buscarPorReferencia(referencia: string): Promise<Pago | null>;
  abstract guardar(pago: Pago): Promise<Pago>;
}

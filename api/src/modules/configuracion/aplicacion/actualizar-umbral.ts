import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ParametroRepository } from './parametro.repository';

export class ActualizarUmbral {
  constructor(private readonly parametros: ParametroRepository) {}

  async ejecutar(valor: number): Promise<void> {
    const umbral = UmbralConfianza.crear(valor);
    await this.parametros.guardarUmbral(umbral);
  }
}
import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ParametroRepository } from './parametro.repository';

export class ConsultarUmbral {
  constructor(private readonly parametros: ParametroRepository) {}

  async ejecutar(): Promise<UmbralConfianza> {
    return this.parametros.obtenerUmbral();
  }
}
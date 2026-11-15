import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ParametroRepository } from './parametro.repository';

export class ParametroRepositoryEnMemoria extends ParametroRepository {
  constructor(private umbral: UmbralConfianza) {
    super();
  }

  obtenerUmbral(): Promise<UmbralConfianza> {
    return Promise.resolve(this.umbral);
  }

  guardarUmbral(umbral: UmbralConfianza): Promise<void> {
    this.umbral = umbral;
    return Promise.resolve();
  }
}
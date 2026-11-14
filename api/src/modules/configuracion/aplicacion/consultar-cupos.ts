import { Cupo } from '../dominio/cupo';
import { CupoRepository } from './cupo.repository';

export class ConsultarCupos {
  constructor(private readonly cupos: CupoRepository) {}

  async ejecutar(): Promise<Cupo[]> {
    return this.cupos.obtenerTodos();
  }
}
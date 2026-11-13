import { Cupo } from '../dominio/cupo';

export abstract class CupoRepository {
  abstract obtenerTodos(): Promise<Cupo[]>;
  abstract guardarTodos(cupos: Cupo[]): Promise<void>;
}
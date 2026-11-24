import { Cupo } from '../dominio/cupo';

export abstract class CupoRepository {
  abstract obtenerTodos(): Promise<Cupo[]>;
  /** Confirma el lote como unidad, actualizando solo los tipos incluidos. */
  abstract guardarTodos(cupos: Cupo[]): Promise<void>;
}

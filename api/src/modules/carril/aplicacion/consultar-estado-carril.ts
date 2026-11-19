import type { EstadoCarril } from '../dominio/estado-carril';
import { EstadoCarrilStore } from './estado-carril.store';

/** Consulta el último estado disponible sin ejecutar operaciones del carril. */
export class ConsultarEstadoCarril {
  constructor(private readonly estadoCarril: EstadoCarrilStore) {}

  async ejecutar(): Promise<EstadoCarril> {
    return this.estadoCarril.obtener();
  }
}

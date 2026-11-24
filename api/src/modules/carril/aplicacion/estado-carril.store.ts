import { EstadoCarril } from '../dominio/estado-carril';

/**
 * Puerto EstadoCarrilStore: guarda y entrega el estado actual del carril.
 * Los casos de uso de ingreso y salida publican el resultado con él y el
 * endpoint de sondeo lo lee. Clase abstracta para servir también como token
 * de inyección de Nest.
 */
export abstract class EstadoCarrilStore {
  /** Reemplaza el estado actual del carril. */
  abstract guardar(estado: EstadoCarril): Promise<void>;

  /** Devuelve el último estado guardado, o el estado inicial si no hay ninguno. */
  abstract obtener(): Promise<EstadoCarril>;
}
import { Evento } from '../dominio/evento';

/**
 * Puerto para registrar los eventos del carril. Los casos de uso dependen
 * de esta clase y no de la tecnología de almacenamiento.
 */
export abstract class EventoRepository {
  abstract registrar(evento: Evento): Promise<void>;
}
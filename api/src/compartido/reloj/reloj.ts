/**
 * Puerto Reloj: única fuente de la hora para los casos de uso (CARQ-9).
 * Clase abstracta para que sirva también como token de inyección de Nest,
 * sin importar nada de infraestructura.
 */
export abstract class Reloj {
  /** Instante actual. */
  abstract ahora(): Date;
}
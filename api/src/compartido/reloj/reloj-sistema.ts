import { Reloj } from './reloj';

/** Implementación real del puerto Reloj: devuelve el instante actual (CARQ-10). */
export class RelojSistema extends Reloj {
  ahora(): Date {
    return new Date();
  }
}
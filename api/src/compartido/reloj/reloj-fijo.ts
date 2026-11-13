import { Reloj } from './reloj';

/** Reloj con instante configurable para simular 05:50, 05:59, 06:00, 19:00, etc. (CARQ-11). */
export class RelojFijo extends Reloj {
  private instante: Date;

  constructor(instante: Date) {
    super();
    this.instante = new Date(instante);
  }

  ahora(): Date {
    return new Date(this.instante);
  }

  fijar(instante: Date): void {
    this.instante = new Date(instante);
  }

  avanzar(milisegundos: number): void {
    this.instante = new Date(this.instante.getTime() + milisegundos);
  }
}
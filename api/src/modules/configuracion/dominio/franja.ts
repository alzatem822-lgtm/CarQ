export type TipoFranja = 'DIURNA' | 'NOCTURNA';

export class Franja {
  private constructor(
    readonly inicioHora: number,
    readonly finHora: number,
  ) {}

  static diurna(inicioHora: number, finHora: number): Franja {
    if (!Number.isInteger(inicioHora) || inicioHora < 0 || inicioHora > 23) {
      throw new Error('La hora de inicio debe estar entre 0 y 23');
    }
    if (!Number.isInteger(finHora) || finHora < 1 || finHora > 24) {
      throw new Error('La hora de fin debe estar entre 1 y 24');
    }
    if (inicioHora >= finHora) {
      throw new Error('El inicio de la franja debe ser menor que el fin');
    }
    return new Franja(inicioHora, finHora);
  }

  tipoDe(hora: number): TipoFranja {
    return hora >= this.inicioHora && hora < this.finHora
      ? 'DIURNA'
      : 'NOCTURNA';
  }
}
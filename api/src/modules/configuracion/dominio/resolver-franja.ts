import { HoraLocal } from '../../../compartido/tiempo/hora-local';
import { Franja, TipoFranja } from './franja';

export class ResolverFranja {
  private readonly horaLocal: HoraLocal;

  constructor(zonaHoraria = 'America/Bogota') {
    this.horaLocal = new HoraLocal(zonaHoraria);
  }

  resolver(instante: Date, horario: Franja): TipoFranja {
    return horario.tipoDe(this.horaLocal.de(instante).getUTCHours());
  }
}

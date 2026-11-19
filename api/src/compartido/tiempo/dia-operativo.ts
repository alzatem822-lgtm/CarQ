import { HoraLocal } from './hora-local';

export class DiaOperativo {
  private readonly horaLocal: HoraLocal;
  private readonly corteMinutos: number;

  constructor(zonaHoraria = 'America/Bogota', inicio = '06:00') {
    this.horaLocal = new HoraLocal(zonaHoraria);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio)) {
      throw new Error(
        'El inicio del día operativo debe estar en formato HH:mm',
      );
    }
    const [hora, minuto] = inicio.split(':').map(Number);
    this.corteMinutos = hora * 60 + minuto;
  }

  de(instante: Date): string {
    const local = this.horaLocal.de(instante);
    const minutos = local.getUTCHours() * 60 + local.getUTCMinutes();
    if (minutos < this.corteMinutos) local.setUTCDate(local.getUTCDate() - 1);
    return local.toISOString().slice(0, 10);
  }
}

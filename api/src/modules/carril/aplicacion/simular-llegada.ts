import { SensorPresencia } from './sensor-presencia';

/** Notifica una llegada utilizando el sensor seleccionado para el carril. */
export class SimularLlegada {
  constructor(private readonly sensor: SensorPresencia) {}

  async ejecutar(): Promise<void> {
    await this.sensor.notificarPresencia(true);
  }
}

import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { SensorPresencia } from '../aplicacion/sensor-presencia';

/** Simula la señal de presencia que recibe el carril desde un sensor. */
export class SensorSimulado extends SensorPresencia {
  constructor(private readonly estadoCarril: EstadoCarrilStore) {
    super();
  }

  /** Actualiza la presencia conservando la lectura y la decisión de barrera. */
  async notificarPresencia(presente: boolean): Promise<void> {
    const estado = await this.estadoCarril.obtener();
    await this.estadoCarril.guardar({
      ...estado,
      vehiculoPresente: presente,
    });
  }
}

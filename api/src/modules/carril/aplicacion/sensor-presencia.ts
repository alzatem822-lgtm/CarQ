/**
 * Puerto para notificar presencia o ausencia de un vehículo en el carril.
 * Los consumidores dependen de este contrato; los adaptadores determinan
 * si la señal procede del simulador o del sensor físico.
 * La clase abstracta también sirve como token de inyección.
 */
export abstract class SensorPresencia {
  /** Notifica `true` al detectar presencia y `false` al dejar de detectarla. */
  abstract notificarPresencia(presente: boolean): Promise<void>;
}

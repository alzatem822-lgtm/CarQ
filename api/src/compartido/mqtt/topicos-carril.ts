import { ErrorDominio } from '../errores/error-dominio';

export interface TopicosCarrilMqtt {
  readonly sensor: string;
  readonly comandoBarrera: string;
  readonly estadoBarrera: string;
}

/** Único punto de construcción de tópicos para los adaptadores del carril. */
export function construirTopicosCarril(
  sedeId: number,
  carrilId: number,
): TopicosCarrilMqtt {
  for (const id of [sedeId, carrilId]) {
    if (!Number.isSafeInteger(id) || id <= 0)
      throw new ErrorDominio(
        'IDENTIFICADOR_MQTT_INVALIDO',
        'La sede y el carril deben ser identificadores enteros positivos',
      );
  }
  const base = `parqueadero/${sedeId}/${carrilId}`;
  return Object.freeze({
    sensor: `${base}/sensor`,
    comandoBarrera: `${base}/barrera/comando`,
    estadoBarrera: `${base}/barrera/estado`,
  });
}

import { connect, type MqttClient } from 'mqtt';

export type EstadoConexionMqtt = 'conectado' | 'desconectado';

/** Cliente compartido: se inicia después de registrar sus consumidores. */
export function crearClienteMqtt(
  url: string,
  alCambiarEstado: (estado: EstadoConexionMqtt) => void,
): MqttClient {
  try {
    const destino = new URL(url);
    if (!['mqtt:', 'mqtts:'].includes(destino.protocol) || !destino.hostname)
      throw new Error();
  } catch {
    // Nunca incluir la URL: puede contener usuario y contraseña.
    throw new Error('URL_MQTT debe ser una URL válida MQTT o MQTTS');
  }
  const cliente = connect(url, {
    manualConnect: true,
    reconnectPeriod: 1000,
    reconnectOnConnackError: true,
    connectTimeout: 5000,
    clean: true,
    resubscribe: true,
    queueQoSZero: false,
  });
  let ultimoEstado: EstadoConexionMqtt | undefined;
  const informar = (estado: EstadoConexionMqtt) => {
    if (
      estado === 'desconectado' &&
      (cliente.disconnecting || cliente.disconnected)
    )
      return;
    if (ultimoEstado === estado) return;
    ultimoEstado = estado;
    alCambiarEstado(estado);
  };
  cliente.on('connect', () => informar('conectado'));
  cliente.on('offline', () => informar('desconectado'));
  cliente.on('close', () => informar('desconectado'));
  cliente.on('error', () => informar('desconectado'));
  return cliente;
}

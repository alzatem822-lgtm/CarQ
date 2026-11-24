import type { MqttClient } from 'mqtt';

/** Espera un evento del cliente tipado, con limpieza y tiempo máximo. */
export function esperarEventoMqtt(
  cliente: MqttClient,
  evento: 'connect' | 'close',
  tiempoMs = 8000,
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const terminar = (error?: Error) => {
      clearTimeout(temporizador);
      cliente.removeListener(evento, alEvento);
      cliente.removeListener('error', alError);
      if (error) rechazar(error);
      else resolver();
    };
    const alEvento = () => terminar();
    const alError = () =>
      terminar(new Error('Falló la conexión MQTT de pruebas'));
    const temporizador = setTimeout(
      () => terminar(new Error('Se agotó la espera del evento MQTT')),
      tiempoMs,
    );
    cliente.once(evento, alEvento);
    cliente.once('error', alError);
  });
}

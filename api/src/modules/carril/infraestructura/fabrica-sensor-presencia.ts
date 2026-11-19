import type { Entorno } from '../../../compartido/configuracion/validar-entorno';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { SensorSimulado } from './sensor-simulado';

/** Selecciona el sensor sin sustituir una opción MQTT por una simulación. */
export function crearSensorPresencia(
  tipo: Entorno['FUENTE_SENSOR'],
  estadoCarril: EstadoCarrilStore,
  crearMqtt?: () => SensorPresencia,
): SensorPresencia {
  if (tipo === 'simulado') return new SensorSimulado(estadoCarril);
  if (tipo === 'mqtt' && crearMqtt) return crearMqtt();
  throw new ErrorDominio(
    'SENSOR_NO_DISPONIBLE',
    `El sensor de presencia "${tipo}" no está disponible`,
  );
}

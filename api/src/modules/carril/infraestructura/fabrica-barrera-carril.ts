import type { Entorno } from '../../../compartido/configuracion/validar-entorno';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { BarreraSimulada } from './barrera-simulada';

/** Selecciona la barrera sin sustituir una opción MQTT por una simulación. */
export function crearBarreraCarril(
  tipo: Entorno['CONTROLADOR_BARRERA'],
  estadoCarril: EstadoCarrilStore,
  crearMqtt?: () => BarreraCarril,
): BarreraCarril {
  if (tipo === 'simulado') return new BarreraSimulada(estadoCarril);
  if (tipo === 'mqtt' && crearMqtt) return crearMqtt();
  throw new ErrorDominio(
    'BARRERA_NO_DISPONIBLE',
    `El controlador de barrera "${tipo}" no está disponible`,
  );
}

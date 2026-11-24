import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import type { EstadoCarril } from '../dominio/estado-carril';

const pendientes = new WeakMap<EstadoCarrilStore, Promise<void>>();

/** Sensor y barrera comparten la cola de su store para no sobrescribirse. */
export function actualizarEstadoMqtt(
  store: EstadoCarrilStore,
  transformar: (actual: EstadoCarril) => EstadoCarril | undefined,
): Promise<void> {
  const operacion = (pendientes.get(store) ?? Promise.resolve()).then(
    async () => {
      const siguiente = transformar(await store.obtener());
      if (siguiente) await store.guardar(siguiente);
    },
  );
  const continuacion = operacion.catch(() => undefined);
  pendientes.set(store, continuacion);
  void continuacion.then(() => {
    if (pendientes.get(store) === continuacion) pendientes.delete(store);
  });
  return operacion;
}

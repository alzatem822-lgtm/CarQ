import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { EstadoCarril, estadoCarrilInicial } from '../dominio/estado-carril';

/**
 * Adaptador en memoria de EstadoCarrilStore. Guarda el estado en el proceso
 * del api (una sede, un carril). Es transitorio a propósito: al reiniciar el
 * api el carril vuelve a su estado inicial.
 */
export class EstadoCarrilEnMemoriaStore extends EstadoCarrilStore {
  private estado: EstadoCarril = estadoCarrilInicial();

  async guardar(estado: EstadoCarril): Promise<void> {
    this.estado = estado;
  }

  async obtener(): Promise<EstadoCarril> {
    return this.estado;
  }
}
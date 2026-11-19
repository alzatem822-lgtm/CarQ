import type { EstadoCarril } from '../dominio/estado-carril';

/**
 * Puerto de control de la barrera, independiente de su implementación.
 * El cierre es automático: lo realiza el firmware en hardware y el adaptador
 * en la simulación. La clase abstracta también sirve como token de inyección.
 */
export abstract class BarreraCarril {
  /** Ordena abrir y comunica el motivo de la autorización. */
  abstract abrir(motivo: string): Promise<void>;

  /** Deniega el paso y comunica su motivo sin ordenar una apertura. */
  abstract denegar(motivo: string): Promise<void>;

  /** Devuelve el último estado conocido de la barrera y su motivo. */
  abstract consultarEstado(): Promise<EstadoCarril['barrera']>;
}

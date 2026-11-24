import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Estancia } from '../dominio/estancia';

/**
 * Puerto de persistencia de estancias.
 * Los casos de uso dependen solo de esta abstracción, nunca de la base de datos.
 */
export abstract class EstanciaRepository {
  /** Guarda una estancia nueva y la devuelve con su id asignado. */
  abstract abrir(estancia: Estancia): Promise<Estancia>;

  /** Cierra la estancia con la hora de salida. Devuelve `null` si no estaba abierta. */
  abstract cerrar(id: number, salidaEn: Date): Promise<Estancia | null>;

  /** Busca la estancia abierta de una placa en una sede, o `null` si no hay. */
  abstract buscarAbiertaPorPlaca(
    placa: Placa,
    sedeId: number,
  ): Promise<Estancia | null>;

  /** Cuenta las estancias abiertas (salida nula) de un tipo en una sede. */
  abstract contarAbiertasPorTipo(
    sedeId: number,
    tipoVehiculo: TipoVehiculo,
  ): Promise<number>;
}
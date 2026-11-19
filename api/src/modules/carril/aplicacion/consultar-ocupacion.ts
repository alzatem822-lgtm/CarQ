import { CupoRepository } from '../../configuracion/aplicacion/cupo.repository';
import { EstanciaRepository } from './estancia.repository';

export interface OcupacionPorTipo {
  readonly tipoVehiculo: string;
  readonly ocupacion: number;
  readonly maximo: number;
}

/** Consulta las estancias abiertas y la capacidad configurada de una sede. */
export class ConsultarOcupacion {
  constructor(
    private readonly cupos: CupoRepository,
    private readonly estancias: EstanciaRepository,
  ) {}

  /** Recibe el identificador numérico de PostgreSQL, no la etiqueta MQTT. */
  async ejecutar(sedeId: number): Promise<OcupacionPorTipo[]> {
    if (!Number.isSafeInteger(sedeId) || sedeId <= 0) {
      throw new Error('La sede debe tener un identificador entero positivo');
    }

    const cupos = await this.cupos.obtenerTodos();
    return Promise.all(
      cupos
        .filter((cupo) => cupo.sedeId === String(sedeId))
        .map(async (cupo) => ({
          tipoVehiculo: cupo.tipoVehiculo.codigo,
          ocupacion: await this.estancias.contarAbiertasPorTipo(
            sedeId,
            cupo.tipoVehiculo,
          ),
          maximo: cupo.maximo,
        })),
    );
  }
}

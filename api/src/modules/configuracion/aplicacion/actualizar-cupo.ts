import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoRepository } from './cupo.repository';

/**
 * Sede a la que pertenece el cupo: su id, o una función que lo resuelve
 * cuando se necesita (así el módulo no consulta la base al arrancar).
 */
export type OrigenSede = string | (() => Promise<string>);

export class ActualizarCupo {
  constructor(
    private readonly cupos: CupoRepository,
    private readonly sede: OrigenSede,
  ) {}

  async ejecutar(tipo: TipoVehiculo, maximo: number): Promise<void> {
    const sedeId = typeof this.sede === 'string' ? this.sede : await this.sede();
    const actualizado = Cupo.crear(sedeId, tipo, maximo);
    const actuales = await this.cupos.obtenerTodos();
    const otros = actuales.filter((c) => !c.tipoVehiculo.equals(tipo));
    await this.cupos.guardarTodos([...otros, actualizado]);
  }
}
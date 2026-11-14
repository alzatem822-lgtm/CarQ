import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoRepository } from './cupo.repository';

export class ActualizarCupo {
  constructor(
    private readonly cupos: CupoRepository,
    private readonly sedeId: string,
  ) {}

  async ejecutar(tipo: TipoVehiculo, maximo: number): Promise<void> {
    const actualizado = Cupo.crear(this.sedeId, tipo, maximo);
    const actuales = await this.cupos.obtenerTodos();
    const otros = actuales.filter((c) => !c.tipoVehiculo.equals(tipo));
    await this.cupos.guardarTodos([...otros, actualizado]);
  }
}
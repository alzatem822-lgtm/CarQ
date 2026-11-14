import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';

export class Cupo {
  private constructor(
    readonly sedeId: string,
    readonly tipoVehiculo: TipoVehiculo,
    readonly maximo: number,
  ) {}

  static crear(
    sedeId: string,
    tipoVehiculo: TipoVehiculo,
    maximo: number,
  ): Cupo {
    if (!sedeId?.trim()) {
      throw new Error('El cupo necesita una sede');
    }
    if (!(tipoVehiculo instanceof TipoVehiculo)) {
      throw new Error('El cupo necesita un tipo de vehículo válido');
    }
    if (!Number.isInteger(maximo) || maximo < 0) {
      throw new Error('El máximo del cupo debe ser un entero no negativo');
    }
    return new Cupo(sedeId.trim(), tipoVehiculo, maximo);
  }
}
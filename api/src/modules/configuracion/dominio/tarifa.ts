import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { TipoFranja } from './franja';

export class Tarifa {
  private constructor(
    readonly sedeId: string,
    readonly tipoVehiculo: TipoVehiculo,
    readonly franja: TipoFranja,
    readonly valor: number,
  ) {}

  static crear(
    sedeId: string,
    tipoVehiculo: TipoVehiculo,
    franja: TipoFranja,
    valor: number,
  ): Tarifa {
    if (!sedeId?.trim()) {
      throw new Error('La tarifa necesita una sede');
    }
    if (!(tipoVehiculo instanceof TipoVehiculo)) {
      throw new Error('La tarifa necesita un tipo de vehículo válido');
    }
    if (franja !== 'DIURNA' && franja !== 'NOCTURNA') {
      throw new Error('La tarifa necesita una franja válida');
    }
    if (!Number.isInteger(valor) || valor < 0) {
      throw new Error('El valor de la tarifa debe ser un entero no negativo');
    }
    return new Tarifa(sedeId.trim(), tipoVehiculo, franja, valor);
  }
}
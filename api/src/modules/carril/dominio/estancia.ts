import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';

export interface DatosEstancia {
  id: number | null;
  placa: Placa;
  sedeId: number;
  carrilId: number;
  tipoVehiculo: TipoVehiculo;
  ingresoEn: Date;
  salidaEn: Date | null;
}

/**
 * Permanencia de un vehículo en el parqueadero.
 * Está abierta mientras `salidaEn` es nula; la ocupación de cupos
 * es el conteo de estancias abiertas por tipo de vehículo.
 */
export class Estancia {
  private constructor(
    readonly id: number | null,
    readonly placa: Placa,
    readonly sedeId: number,
    readonly carrilId: number,
    readonly tipoVehiculo: TipoVehiculo,
    readonly ingresoEn: Date,
    readonly salidaEn: Date | null,
  ) {}

  /** Crea una estancia nueva: sin id (lo asigna la base) y con salida nula. */
  static abrir(
    datos: Omit<DatosEstancia, 'id' | 'salidaEn'>,
  ): Estancia {
    return new Estancia(
      null,
      datos.placa,
      datos.sedeId,
      datos.carrilId,
      datos.tipoVehiculo,
      datos.ingresoEn,
      null,
    );
  }

  /** Rehidrata una estancia ya persistida (la usan los adaptadores). */
  static reconstruir(datos: DatosEstancia): Estancia {
    return new Estancia(
      datos.id,
      datos.placa,
      datos.sedeId,
      datos.carrilId,
      datos.tipoVehiculo,
      datos.ingresoEn,
      datos.salidaEn,
    );
  }

  estaAbierta(): boolean {
    return this.salidaEn === null;
  }
}
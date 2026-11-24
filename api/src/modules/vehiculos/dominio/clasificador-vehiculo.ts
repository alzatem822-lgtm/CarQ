import { Placa } from './placa';
import { TipoVehiculo } from './tipo-vehiculo';

export class ClasificadorVehiculo {
  clasificar(placa: Placa): TipoVehiculo {
    return placa.esFormatoMoto() ? TipoVehiculo.MOTO : TipoVehiculo.CARRO;
  }
}
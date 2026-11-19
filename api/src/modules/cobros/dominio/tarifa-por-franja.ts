import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoFranja } from '../../configuracion/dominio/franja';
import { Tarifa } from '../../configuracion/dominio/tarifa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { EstrategiaTarifa } from './estrategia-tarifa';

export class TarifaPorFranja implements EstrategiaTarifa {
  constructor(readonly tipoVehiculo: TipoVehiculo) {}

  calcular(franja: TipoFranja, tarifas: readonly Tarifa[]): number {
    const tarifa = tarifas.find(
      (t) => t.tipoVehiculo.equals(this.tipoVehiculo) && t.franja === franja,
    );
    if (!tarifa) {
      throw new ErrorDominio(
        'TARIFA_NO_CONFIGURADA',
        'Falta la tarifa para el tipo de vehículo y franja.',
      );
    }
    return tarifa.valor;
  }
}

export const tarifaCarro = new TarifaPorFranja(TipoVehiculo.CARRO);

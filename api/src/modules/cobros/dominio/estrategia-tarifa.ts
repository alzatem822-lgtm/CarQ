import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoFranja } from '../../configuracion/dominio/franja';
import { Tarifa } from '../../configuracion/dominio/tarifa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';

export interface EstrategiaTarifa {
  readonly tipoVehiculo: TipoVehiculo;
  calcular(franja: TipoFranja, tarifas: readonly Tarifa[]): number;
}

export class RegistroEstrategiasTarifa {
  private readonly porTipo = new Map<string, EstrategiaTarifa>();

  constructor(estrategias: readonly EstrategiaTarifa[]) {
    for (const estrategia of estrategias) {
      const codigo = estrategia.tipoVehiculo.codigo;
      if (this.porTipo.has(codigo)) {
        throw new Error(`Ya existe una estrategia de tarifa para ${codigo}`);
      }
      this.porTipo.set(codigo, estrategia);
    }
  }

  resolver(
    tipo: TipoVehiculo,
    franja: TipoFranja,
    tarifas: readonly Tarifa[],
  ): number {
    const estrategia = this.porTipo.get(tipo.codigo);
    if (!estrategia) {
      throw new ErrorDominio(
        'TARIFA_NO_CONFIGURADA',
        'No hay estrategia para el tipo de vehículo.',
      );
    }
    return estrategia.calcular(franja, tarifas);
  }
}

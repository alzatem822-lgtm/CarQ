import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { validarNocturnaMenorQueDiurna } from '../dominio/regla-nocturna-menor';
import { Tarifa } from '../dominio/tarifa';
import { TarifaRepository } from './tarifa.repository';

export class ActualizarTarifas {
  constructor(private readonly tarifas: TarifaRepository) {}

  async ejecutar(nuevas: Tarifa[]): Promise<void> {
    const actuales = await this.tarifas.obtenerTodas();
    const resultado = [
      ...actuales.filter((a) => !nuevas.some((n) => esLaMisma(a, n))),
      ...nuevas,
    ];

    try {
      validarNocturnaMenorQueDiurna(resultado);
    } catch (error) {
      throw new ErrorDominio('TARIFA_INVALIDA', (error as Error).message);
    }

    await this.tarifas.guardarTodas(nuevas);
  }
}

function esLaMisma(a: Tarifa, b: Tarifa): boolean {
  return (
    a.sedeId === b.sedeId &&
    a.tipoVehiculo.equals(b.tipoVehiculo) &&
    a.franja === b.franja
  );
}

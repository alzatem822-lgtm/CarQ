import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { validarNocturnaMenorQueDiurna } from './regla-nocturna-menor';
import { Tarifa } from './tarifa';

function par(tipo: TipoVehiculo, diurna: number, nocturna: number): Tarifa[] {
  return [
    Tarifa.crear('s1', tipo, 'DIURNA', diurna),
    Tarifa.crear('s1', tipo, 'NOCTURNA', nocturna),
  ];
}

describe('validarNocturnaMenorQueDiurna (RN-02)', () => {
  it('rechaza nocturna mayor que diurna', () => {
    expect(() =>
      validarNocturnaMenorQueDiurna(par(TipoVehiculo.CARRO, 5000, 6000)),
    ).toThrow('menor');
  });

  it('rechaza nocturna igual a diurna', () => {
    expect(() =>
      validarNocturnaMenorQueDiurna(par(TipoVehiculo.CARRO, 5000, 5000)),
    ).toThrow('menor');
  });

  it('acepta nocturna menor que diurna', () => {
    expect(() =>
      validarNocturnaMenorQueDiurna(par(TipoVehiculo.CARRO, 5000, 3000)),
    ).not.toThrow();
  });

  it('acepta diurna 0 y nocturna 0 (moto sin cobro)', () => {
    expect(() =>
      validarNocturnaMenorQueDiurna(par(TipoVehiculo.MOTO, 0, 0)),
    ).not.toThrow();
  });

  it('valida cada tipo por separado', () => {
    const tarifas = [
      ...par(TipoVehiculo.CARRO, 5000, 3000),
      ...par(TipoVehiculo.MOTO, 1000, 1000),
    ];
    expect(() => validarNocturnaMenorQueDiurna(tarifas)).toThrow('MOTO');
  });
});
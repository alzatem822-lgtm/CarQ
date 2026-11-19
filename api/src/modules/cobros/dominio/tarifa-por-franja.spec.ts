import { Tarifa } from '../../configuracion/dominio/tarifa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { RegistroEstrategiasTarifa } from './estrategia-tarifa';
import { tarifaCarro, tarifaMoto } from './tarifa-por-franja';

describe('Estrategias de tarifa por franja', () => {
  const carro = TipoVehiculo.CARRO;
  const configuracion = [
    Tarifa.crear('1', carro, 'DIURNA', 5000),
    Tarifa.crear('1', carro, 'NOCTURNA', 3000),
  ];

  it('selecciona la estrategia de CARRO y usa el precio de la franja', () => {
    const registro = new RegistroEstrategiasTarifa([tarifaCarro]);
    expect(registro.resolver(carro, 'DIURNA', configuracion)).toBe(5000);
    expect(registro.resolver(carro, 'NOCTURNA', configuracion)).toBe(3000);
  });

  it('utiliza tanto cero como importes positivos configurados para MOTO', () => {
    const moto = TipoVehiculo.MOTO;
    const registro = new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]);
    const tarifas = [
      ...configuracion,
      Tarifa.crear('1', moto, 'DIURNA', 1800),
      Tarifa.crear('1', moto, 'NOCTURNA', 0),
    ];
    expect(registro.resolver(moto, 'NOCTURNA', tarifas)).toBe(0);
    expect(registro.resolver(moto, 'DIURNA', tarifas)).toBe(1800);
  });
});

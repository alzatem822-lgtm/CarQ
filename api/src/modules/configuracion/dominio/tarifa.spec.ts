import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Tarifa } from './tarifa';

describe('Tarifa', () => {
  it('se crea con sede, tipo, franja y valor', () => {
    const tarifa = Tarifa.crear('s1', TipoVehiculo.CARRO, 'DIURNA', 5000);
    expect(tarifa.sedeId).toBe('s1');
    expect(tarifa.tipoVehiculo).toBe(TipoVehiculo.CARRO);
    expect(tarifa.franja).toBe('DIURNA');
    expect(tarifa.valor).toBe(5000);
  });

  it('acepta valor cero (moto sin cobro)', () => {
    const tarifa = Tarifa.crear('s1', TipoVehiculo.MOTO, 'NOCTURNA', 0);
    expect(tarifa.valor).toBe(0);
  });

  it('rechaza un valor negativo', () => {
    expect(() =>
      Tarifa.crear('s1', TipoVehiculo.CARRO, 'DIURNA', -1),
    ).toThrow('no negativo');
  });

  it('rechaza un tipo de vehículo inválido', () => {
    expect(() =>
      Tarifa.crear('s1', undefined as unknown as TipoVehiculo, 'DIURNA', 100),
    ).toThrow('tipo de vehículo');
  });

  it('rechaza una sede vacía', () => {
    expect(() =>
      Tarifa.crear('  ', TipoVehiculo.CARRO, 'DIURNA', 100),
    ).toThrow('sede');
  });
});
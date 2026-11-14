import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from './cupo';

describe('Cupo', () => {
  it('se crea con sede, tipo y máximo', () => {
    const cupo = Cupo.crear('s1', TipoVehiculo.CARRO, 50);
    expect(cupo.sedeId).toBe('s1');
    expect(cupo.tipoVehiculo).toBe(TipoVehiculo.CARRO);
    expect(cupo.maximo).toBe(50);
  });

  it('acepta máximo cero (sin cupo disponible)', () => {
    const cupo = Cupo.crear('s1', TipoVehiculo.MOTO, 0);
    expect(cupo.maximo).toBe(0);
  });

  it('rechaza un máximo negativo', () => {
    expect(() => Cupo.crear('s1', TipoVehiculo.CARRO, -1)).toThrow(
      'no negativo',
    );
  });

  it('rechaza un máximo no entero', () => {
    expect(() => Cupo.crear('s1', TipoVehiculo.CARRO, 1.5)).toThrow(
      'no negativo',
    );
  });

  it('rechaza un tipo de vehículo inválido', () => {
    expect(() =>
      Cupo.crear('s1', undefined as unknown as TipoVehiculo, 10),
    ).toThrow('tipo de vehículo');
  });

  it('rechaza una sede vacía', () => {
    expect(() => Cupo.crear('  ', TipoVehiculo.CARRO, 10)).toThrow('sede');
  });
});
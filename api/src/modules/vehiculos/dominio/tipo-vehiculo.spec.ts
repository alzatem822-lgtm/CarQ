import { TipoVehiculo } from './tipo-vehiculo';

describe('TipoVehiculo', () => {
  it('existen carro y moto', () => {
    expect(TipoVehiculo.CARRO.codigo).toBe('CARRO');
    expect(TipoVehiculo.MOTO.codigo).toBe('MOTO');
  });

  it('resuelve un tipo a partir de su código', () => {
    expect(TipoVehiculo.desde('MOTO')).toBe(TipoVehiculo.MOTO);
  });

  it('rechaza un código desconocido', () => {
    expect(() => TipoVehiculo.desde('BUS')).toThrow('desconocido');
  });

  it('compara tipos por código', () => {
    expect(TipoVehiculo.CARRO.equals(TipoVehiculo.CARRO)).toBe(true);
    expect(TipoVehiculo.CARRO.equals(TipoVehiculo.MOTO)).toBe(false);
  });
});
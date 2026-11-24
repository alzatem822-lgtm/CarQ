import { ClasificadorVehiculo } from './clasificador-vehiculo';
import { Placa } from './placa';
import { TipoVehiculo } from './tipo-vehiculo';

describe('ClasificadorVehiculo', () => {
  const clasificador = new ClasificadorVehiculo();

  it('clasifica AAA123 como carro', () => {
    const tipo = clasificador.clasificar(Placa.crear('ABC123'));
    expect(tipo.equals(TipoVehiculo.CARRO)).toBe(true);
  });

  it('clasifica AAA12A como moto', () => {
    const tipo = clasificador.clasificar(Placa.crear('ABC12D'));
    expect(tipo.equals(TipoVehiculo.MOTO)).toBe(true);
  });
});
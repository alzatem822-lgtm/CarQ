import { Placa } from './placa';
import { PlacaInvalidaError } from './placa-invalida.error';

describe('Placa', () => {
  it('acepta formato de carro AAA123', () => {
    expect(Placa.crear('ABC123').valor).toBe('ABC123');
  });

  it('acepta formato de moto AAA12A', () => {
    expect(Placa.crear('ABC12D').valor).toBe('ABC12D');
  });

  it('normaliza a mayúsculas', () => {
    expect(Placa.crear('abc123').valor).toBe('ABC123');
  });

  it.each(['AB1234', 'ABCD12', 'ABC1234', '123ABC', 'ABC12', ''])(
    'rechaza el formato inválido %p',
    (texto) => {
      expect(() => Placa.crear(texto)).toThrow(PlacaInvalidaError);
    },
  );
});
import { enmascararPlaca } from './enmascarar-placa';

describe('enmascararPlaca', () => {
  it('oculta la placa de carro salvo los últimos tres caracteres', () => {
    expect(enmascararPlaca('ABC123')).toBe('***123');
  });

  it('oculta la placa de moto salvo los últimos tres caracteres', () => {
    expect(enmascararPlaca('AAA12A')).toBe('***12A');
  });

  it('oculta todo si la placa tiene tres caracteres o menos', () => {
    expect(enmascararPlaca('AB1')).toBe('***');
  });
});
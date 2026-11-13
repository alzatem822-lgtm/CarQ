import { RelojSistema } from './reloj-sistema';

describe('RelojSistema', () => {
  it('devuelve el instante actual', () => {
    const antes = Date.now();
    const instante = new RelojSistema().ahora().getTime();
    const despues = Date.now();

    expect(instante).toBeGreaterThanOrEqual(antes);
    expect(instante).toBeLessThanOrEqual(despues);
  });
});
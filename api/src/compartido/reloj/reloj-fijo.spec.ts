import { RelojFijo } from './reloj-fijo';

describe('RelojFijo', () => {
  const instanteInicial = new Date('2026-11-13T10:50:00.000Z'); // 05:50 en Bogotá

  it('devuelve el instante fijado', () => {
    const reloj = new RelojFijo(instanteInicial);

    expect(reloj.ahora().toISOString()).toBe('2026-11-13T10:50:00.000Z');
  });

  it('permite fijar otro instante', () => {
    const reloj = new RelojFijo(instanteInicial);

    reloj.fijar(new Date('2026-11-14T00:00:00.000Z')); // 19:00 en Bogotá

    expect(reloj.ahora().toISOString()).toBe('2026-11-14T00:00:00.000Z');
  });

  it('permite avanzar el instante', () => {
    const reloj = new RelojFijo(instanteInicial);

    reloj.avanzar(10 * 60 * 1000); // 10 minutos: 06:00 en Bogotá

    expect(reloj.ahora().toISOString()).toBe('2026-11-13T11:00:00.000Z');
  });

  it('no cambia si se modifica el Date devuelto', () => {
    const reloj = new RelojFijo(instanteInicial);

    reloj.ahora().setFullYear(2000);

    expect(reloj.ahora().toISOString()).toBe('2026-11-13T10:50:00.000Z');
  });
});
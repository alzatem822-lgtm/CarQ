import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { Franja } from './franja';
import { ResolverFranja } from './resolver-franja';

describe('ResolverFranja', () => {
  const resolver = new ResolverFranja();
  const franja = Franja.diurna(6, 18);

  it.each([
    ['2026-11-19T10:50:00.000Z', 'NOCTURNA'],
    ['2026-11-19T11:00:00.000Z', 'DIURNA'],
    ['2026-11-19T22:59:59.999Z', 'DIURNA'],
    ['2026-11-19T23:00:00.000Z', 'NOCTURNA'],
    ['2026-11-20T00:00:00.000Z', 'NOCTURNA'],
  ])('resuelve %s como %s', (utc, esperado) => {
    const reloj = new RelojFijo(new Date(utc));
    expect(resolver.resolver(reloj.ahora(), franja)).toBe(esperado);
  });
});

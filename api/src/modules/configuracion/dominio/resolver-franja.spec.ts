import { Franja } from './franja';
import { ResolverFranja } from './resolver-franja';

describe('ResolverFranja', () => {
  const resolver = new ResolverFranja();
  it.each([
    ['2026-11-19T10:50:00.000Z', 'NOCTURNA'],
    ['2026-11-19T11:00:00.000Z', 'DIURNA'],
    ['2026-11-19T22:59:59.999Z', 'DIURNA'],
    ['2026-11-19T23:00:00.000Z', 'NOCTURNA'],
    ['2026-11-20T00:00:00.000Z', 'NOCTURNA'],
  ])('resuelve %s como %s', (utc, esperado) => {
    expect(resolver.resolver(new Date(utc), Franja.diurna(6, 18))).toBe(
      esperado,
    );
  });
});

import { DiaOperativo } from './dia-operativo';

describe('Día operativo de Bogotá', () => {
  const dias = new DiaOperativo();

  it.each([
    ['2026-02-01T10:59:59.999Z', '2026-01-31'],
    ['2026-02-01T11:00:00.000Z', '2026-02-01'],
    ['2027-01-01T10:59:00.000Z', '2026-12-31'],
    ['2027-01-01T11:00:00.000Z', '2027-01-01'],
  ])('asigna %s al día %s', (utc, esperado) => {
    expect(dias.de(new Date(utc))).toBe(esperado);
  });
});

import { Franja } from './franja';

describe('Franja', () => {
  const franja = Franja.diurna(6, 18);

  it('una hora dentro del rango es diurna', () => {
    expect(franja.tipoDe(6)).toBe('DIURNA');
    expect(franja.tipoDe(17)).toBe('DIURNA');
  });

  it('el resto del día es nocturno', () => {
    expect(franja.tipoDe(18)).toBe('NOCTURNA');
    expect(franja.tipoDe(5)).toBe('NOCTURNA');
    expect(franja.tipoDe(0)).toBe('NOCTURNA');
  });

  it('cada hora pertenece a una sola franja', () => {
    for (let hora = 0; hora < 24; hora++) {
      expect(['DIURNA', 'NOCTURNA']).toContain(franja.tipoDe(hora));
    }
  });

  it('rechaza un inicio mayor o igual al fin', () => {
    expect(() => Franja.diurna(18, 6)).toThrow('menor');
    expect(() => Franja.diurna(6, 6)).toThrow('menor');
  });

  it('rechaza horas fuera de rango', () => {
    expect(() => Franja.diurna(-1, 18)).toThrow('inicio');
    expect(() => Franja.diurna(6, 25)).toThrow('fin');
  });
});
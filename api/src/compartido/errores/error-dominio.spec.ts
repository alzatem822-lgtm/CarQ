import { ErrorDominio } from './error-dominio';

describe('ErrorDominio', () => {
  it('conserva el código y el motivo', () => {
    const error = new ErrorDominio('TARIFA_INVALIDA', 'La nocturna debe ser menor');
    expect(error.codigo).toBe('TARIFA_INVALIDA');
    expect(error.motivo).toBe('La nocturna debe ser menor');
  });

  it('es una instancia de Error', () => {
    expect(new ErrorDominio('X', 'y')).toBeInstanceOf(Error);
  });
});
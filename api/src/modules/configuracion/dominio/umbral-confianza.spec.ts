import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { UmbralConfianza } from './umbral-confianza';

describe('UmbralConfianza', () => {
  it.each([0, 0.5, 0.85, 1])('acepta %p', (valor) => {
    expect(UmbralConfianza.crear(valor).valor).toBe(valor);
  });

  it.each([-0.01, 1.01, 5, NaN, Infinity])('rechaza %p', (valor) => {
    expect(() => UmbralConfianza.crear(valor)).toThrow(ErrorDominio);
  });
});
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { Placa } from './placa';
import { RequiereValidacionManual } from './requiere-validacion-manual';

describe('RequiereValidacionManual', () => {
  const politica = new RequiereValidacionManual();
  const umbral = UmbralConfianza.crear(0.8);

  it.each([
    [0.79, true],
    [0.8, false],
    [0.95, false],
    [0, true],
    [1, false],
    [-0.1, true],
    [1.1, true],
    [NaN, true],
    [Infinity, true],
  ])('con confianza %s requiere revisión: %s', (confianza, esperado) => {
    expect(
      politica.evaluar(
        {
          placa: Placa.crear('ABC123'),
          confianza,
          origen: 'SIMULADO',
        },
        umbral,
      ),
    ).toBe(esperado);
  });

  it('requiere revisión sin placa aunque la confianza sea alta', () => {
    expect(
      politica.evaluar({ placa: null, confianza: 1, origen: 'OCR' }, umbral),
    ).toBe(true);
  });

  it.each(['ABC123', 'ABC12A'])(
    'acepta el formato válido %s con confianza suficiente',
    (texto) => {
      expect(
        politica.evaluar(
          { placa: Placa.crear(texto), confianza: 0.9, origen: 'OCR' },
          umbral,
        ),
      ).toBe(false);
    },
  );

  it.each([0, 1])('acepta confianza igual al umbral extremo %s', (valor) => {
    expect(
      politica.evaluar(
        { placa: Placa.crear('ABC123'), confianza: valor, origen: 'SIMULADO' },
        UmbralConfianza.crear(valor),
      ),
    ).toBe(false);
  });
});

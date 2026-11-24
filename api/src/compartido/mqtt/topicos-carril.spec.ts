import { ErrorDominio } from '../errores/error-dominio';
import { construirTopicosCarril } from './topicos-carril';

describe('Tópicos únicos por sede y carril (CARQ-184)', () => {
  it('respeta los tres tópicos del contrato de Jira', () => {
    expect(construirTopicosCarril(7, 12)).toEqual({
      sensor: 'parqueadero/7/12/sensor',
      comandoBarrera: 'parqueadero/7/12/barrera/comando',
      estadoBarrera: 'parqueadero/7/12/barrera/estado',
    });
  });

  it('mantiene aislados los canales al cambiar la sede o el carril', () => {
    const topicos = [
      construirTopicosCarril(1, 1),
      construirTopicosCarril(1, 2),
      construirTopicosCarril(2, 1),
    ].flatMap((canales) => Object.values(canales));
    expect(new Set(topicos).size).toBe(9);
  });

  it('impide que un consumidor modifique los tópicos compartidos', () => {
    const topicos = construirTopicosCarril(1, 1);
    expect(Object.isFrozen(topicos)).toBe(true);
    expect(Reflect.set(topicos, 'sensor', 'otro/sensor')).toBe(false);
    expect(topicos.sensor).toBe('parqueadero/1/1/sensor');
  });

  it.each([
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    '1/2',
    '+',
    '#',
  ])('rechaza el identificador inválido %s en sede y carril', (id) => {
    // La validación también protege entradas JavaScript sin tipos.
    for (const [sede, carril] of [
      [id, 1],
      [1, id],
    ]) {
      expect(() =>
        construirTopicosCarril(sede as number, carril as number),
      ).toThrow(ErrorDominio);
      expect(() =>
        construirTopicosCarril(sede as number, carril as number),
      ).toThrow(
        'La sede y el carril deben ser identificadores enteros positivos',
      );
    }
  });
});

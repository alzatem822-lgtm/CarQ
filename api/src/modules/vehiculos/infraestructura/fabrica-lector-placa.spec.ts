import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { crearLectorPlaca } from './fabrica-lector-placa';
import { LectorSimulado } from './lector-simulado';

describe('crearLectorPlaca', () => {
  it('devuelve el lector simulado cuando el tipo es simulado', () => {
    expect(crearLectorPlaca('simulado')).toBeInstanceOf(LectorSimulado);
  });

  it.each(['manual', 'http'] as const)(
    'falla con LECTOR_NO_DISPONIBLE cuando el tipo es %s',
    (tipo) => {
      try {
        crearLectorPlaca(tipo);
        fail('Debió lanzar ErrorDominio');
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorDominio);
        expect((error as ErrorDominio).codigo).toBe('LECTOR_NO_DISPONIBLE');
      }
    },
  );
});
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { crearLectorPlaca } from './fabrica-lector-placa';
import { LectorSimulado } from './lector-simulado';
import { LectorManual } from './lector-manual';

describe('crearLectorPlaca', () => {
  it('devuelve el lector simulado cuando el tipo es simulado', () => {
    expect(crearLectorPlaca('simulado')).toBeInstanceOf(LectorSimulado);
  });

  it('selecciona el lector manual y conserva su contrato', async () => {
    const lector = crearLectorPlaca('manual');
    expect(lector).toBeInstanceOf(LectorManual);
    expect(await lector.leer({ placa: 'ABC123' })).toMatchObject({
      origen: 'MANUAL',
      confianza: 1,
    });
  });

  it.each(['http'] as const)(
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

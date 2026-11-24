import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { crearLectorPlaca } from './fabrica-lector-placa';
import { LectorSimulado } from './lector-simulado';
import { LectorManual } from './lector-manual';
import { LectorOcr } from './lector-ocr';

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

  it('selecciona OCR con su URL sin conectarse durante la construcción', () => {
    expect(crearLectorPlaca('http', 'http://lpr:8000')).toBeInstanceOf(
      LectorOcr,
    );
  });
  it('requiere URL para seleccionar OCR', () => {
    expect(() => crearLectorPlaca('http')).toThrow(ErrorDominio);
  });
});

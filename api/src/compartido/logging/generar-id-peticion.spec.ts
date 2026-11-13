import { generarIdPeticion } from './generar-id-peticion';

describe('generarIdPeticion', () => {
  it('reutiliza el id que llega en la cabecera x-request-id', () => {
    expect(generarIdPeticion({ 'x-request-id': 'abc-123' })).toBe('abc-123');
  });

  it('genera un UUID cuando no llega la cabecera', () => {
    expect(generarIdPeticion({})).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
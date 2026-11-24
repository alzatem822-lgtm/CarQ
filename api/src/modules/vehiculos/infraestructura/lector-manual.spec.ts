import { LectorPlaca } from '../aplicacion/lector-placa';
import { LectorManual } from './lector-manual';

describe('LectorManual (CARQ-81)', () => {
  const lector: LectorPlaca = new LectorManual();
  it.each(['ABC123', 'ABC12A'])(
    'devuelve placa digitada %s con origen manual',
    async (placa) => {
      const lectura = await lector.leer({ placa });
      expect(lectura.placa?.valor).toBe(placa);
      expect(lectura.confianza).toBe(1);
      expect(lectura.origen).toBe('MANUAL');
    },
  );
  it('normaliza la placa y no usa la confianza del OCR o del simulador', async () => {
    const lectura = await lector.leer({ placa: ' abc-12 a ', confianza: 0.1 });
    expect(lectura.placa?.valor).toBe('ABC12A');
    expect(lectura.confianza).toBe(1);
    expect(lectura.origen).toBe('MANUAL');
  });
  it.each([undefined, '', '  ', 'XX', 'ABC1234'])(
    'no permite continuar con placa ausente o inválida %s',
    async (placa) => {
      expect(await lector.leer({ placa, confianza: 1 })).toEqual({
        placa: null,
        confianza: 0,
        origen: 'MANUAL',
      });
    },
  );
  it('no interpreta una imagen como confirmación del operador', async () => {
    expect(
      await lector.leer({ imagen: Buffer.from('imagen'), confianza: 1 }),
    ).toEqual({ placa: null, confianza: 0, origen: 'MANUAL' });
  });
});

import type { LectorPlaca } from '../aplicacion/lector-placa';
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { RequiereValidacionManual } from '../dominio/requiere-validacion-manual';
import { LectorManual } from './lector-manual';
import { LectorOcr } from './lector-ocr';
import { LectorSimulado } from './lector-simulado';

describe.each(['SIMULADO', 'MANUAL', 'OCR'] as const)(
  'Política de lectura manual con lector %s (CARQ-202)',
  (origen) => {
    const politica = new RequiereValidacionManual();
    const umbral = UmbralConfianza.crear(0.8);
    let lector: LectorPlaca;
    let respuestaOcr: { placa: string | null; confianza: number };

    beforeEach(() => {
      lector =
        origen === 'OCR'
          ? new LectorOcr('http://lpr.test')
          : origen === 'MANUAL'
            ? new LectorManual()
            : new LectorSimulado();
      jest.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(respuestaOcr), {
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );
    });

    afterEach(() => jest.restoreAllMocks());

    async function leer(placa?: string, confianza = 1) {
      respuestaOcr = { placa: placa ?? null, confianza: placa ? confianza : 0 };
      return lector.leer({
        placa,
        confianza,
        imagen: Buffer.from('imagen del vehículo'),
      });
    }

    it.each(['XX', 'ABC1234', '123ABC', 'ABC1@3'])(
      'exige validación para formato inválido %s aunque se indique confianza 1',
      async (placa) => {
        const lectura = await leer(placa);
        expect(lectura.origen).toBe(origen);
        expect(lectura.placa).toBeNull();
        expect(politica.evaluar(lectura, umbral)).toBe(true);
      },
    );

    it('exige validación cuando no hay placa', async () => {
      const lectura = await leer();
      expect(lectura.placa).toBeNull();
      expect(politica.evaluar(lectura, umbral)).toBe(true);
    });

    it.each(['ABC123', 'ABC12A'])(
      'permite continuar con placa válida %s y confianza suficiente',
      async (placa) => {
        const lectura = await leer(placa);
        expect(lectura.placa?.valor).toBe(placa);
        expect(politica.evaluar(lectura, umbral)).toBe(false);
      },
    );

    if (origen !== 'MANUAL') {
      it('exige validación por confianza inferior al umbral con placa válida', async () => {
        const lectura = await leer('ABC123', 0.79);
        expect(lectura.placa?.valor).toBe('ABC123');
        expect(politica.evaluar(lectura, umbral)).toBe(true);
      });
    }
  },
);

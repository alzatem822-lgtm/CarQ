import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { ProcesarIngreso } from '../../carril/aplicacion/procesar-ingreso';
import { ProcesarSalida } from '../../carril/aplicacion/procesar-salida';
import { EstadoCarrilEnMemoriaStore } from '../../carril/infraestructura/estado-carril-en-memoria.store';
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { LectorPlaca, type SolicitudLectura } from '../aplicacion/lector-placa';
import type { LecturaPlaca, OrigenLectura } from '../dominio/lectura-placa';
import { Placa } from '../dominio/placa';
import { RequiereValidacionManual } from '../dominio/requiere-validacion-manual';
import { LectorManual } from './lector-manual';
import { LectorOcr } from './lector-ocr';
import { LectorSimulado } from './lector-simulado';

interface AdaptadorPrueba {
  nombre: string;
  origen: OrigenLectura;
  crear(): LectorPlaca;
}

const adaptadores: AdaptadorPrueba[] = [
  { nombre: 'simulado', origen: 'SIMULADO', crear: () => new LectorSimulado() },
  { nombre: 'manual', origen: 'MANUAL', crear: () => new LectorManual() },
  {
    nombre: 'OCR con servicio HTTP doblado',
    origen: 'OCR',
    crear: () => new LectorOcr('http://lpr.test:8000'),
  },
];

/** Misma batería para los adaptadores reales; solo se dobla el servicio externo del OCR. */
describe.each(adaptadores)(
  'CARQ-218: contrato común de $nombre',
  ({ origen, crear }) => {
    let lector: LectorPlaca;
    let remoto: jest.SpyInstance | undefined;

    beforeEach(() => {
      lector = crear();
      if (origen === 'OCR') remoto = jest.spyOn(globalThis, 'fetch');
    });
    afterEach(() => {
      remoto?.mockRestore();
      remoto = undefined;
    });

    function preparar(texto?: string): SolicitudLectura {
      if (origen !== 'OCR') return { placa: texto, confianza: 0.93 };
      remoto!.mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              placa: texto ?? null,
              confianza: texto === undefined ? 0 : 0.93,
            }),
            { status: 200 },
          ),
      );
      return { imagen: Buffer.from('fotograma de prueba') };
    }

    function comprobarContrato(lectura: LecturaPlaca) {
      expect(lectura.origen).toBe(origen);
      expect(Number.isFinite(lectura.confianza)).toBe(true);
      expect(lectura.confianza).toBeGreaterThanOrEqual(0);
      expect(lectura.confianza).toBeLessThanOrEqual(1);
      if (lectura.placa !== null) expect(lectura.placa).toBeInstanceOf(Placa);
    }

    it.each([
      ['ABC123', 'ABC123'],
      ['ABC12A', 'ABC12A'],
      [' abc-123 ', 'ABC123'],
      [' abc-12 a ', 'ABC12A'],
    ])(
      'lee %s y produce la placa normalizada %s',
      async (entrada, esperada) => {
        const solicitud = Object.freeze(preparar(entrada));
        const copia = { ...solicitud };
        const pendiente = lector.leer(solicitud);
        expect(pendiente).toBeInstanceOf(Promise);
        const lectura = await pendiente;
        comprobarContrato(lectura);
        expect(lectura.placa?.valor).toBe(esperada);
        expect(
          new RequiereValidacionManual().evaluar(
            lectura,
            UmbralConfianza.crear(0.8),
          ),
        ).toBe(false);
        expect(solicitud).toEqual(copia);
      },
    );

    it.each([undefined, '', '  ', 'XX', 'ABC1234'])(
      'sin placa válida (%s) permite derivar a validación manual',
      async (entrada) => {
        const lectura = await lector.leer(preparar(entrada));
        comprobarContrato(lectura);
        expect(lectura.placa).toBeNull();
        expect(
          new RequiereValidacionManual().evaluar(
            lectura,
            UmbralConfianza.crear(0.8),
          ),
        ).toBe(true);
      },
    );

    it('no conserva una placa anterior después de una lectura ausente', async () => {
      const primera = await lector.leer(preparar('ABC123'));
      const segunda = await lector.leer(preparar());
      expect(primera.placa?.valor).toBe('ABC123');
      expect(segunda.placa).toBeNull();
      expect(primera.placa?.valor).toBe('ABC123');
      comprobarContrato(segunda);
    });

    it.each([ProcesarIngreso, ProcesarSalida])(
      'el mismo consumidor %p admite y solicita revisión sin conocer el adaptador',
      async (Proceso) => {
        const politica = new RequiereValidacionManual();
        const transaccion = {
          ejecutar: jest.fn(async ({ lectura }: { lectura: LecturaPlaca }) =>
            politica.evaluar(lectura, UmbralConfianza.crear(0.8))
              ? {
                  resultado: 'REQUIERE_LECTURA_MANUAL' as const,
                  motivo: 'Se requiere validación manual',
                }
              : { resultado: 'AUTORIZADO' as const, motivo: 'Autorizado' },
          ),
        };
        const barrera = {
          abrir: jest.fn(),
          denegar: jest.fn(),
          consultarEstado: jest.fn(),
        };
        const estado = new EstadoCarrilEnMemoriaStore();
        const proceso = new Proceso(
          lector,
          new RelojFijo(new Date('2026-11-23T15:00:00Z')),
          transaccion,
          estado,
          barrera,
        );
        await expect(
          proceso.ejecutar(1, 1, preparar('ABC123'), 'operador'),
        ).resolves.toMatchObject({ resultado: 'AUTORIZADO' });
        expect(transaccion.ejecutar).toHaveBeenLastCalledWith(
          expect.objectContaining({
            lectura: expect.objectContaining({ origen }),
            operador: 'operador',
          }),
        );
        await expect(
          proceso.ejecutar(1, 1, preparar(), 'operador'),
        ).resolves.toMatchObject({ resultado: 'REQUIERE_LECTURA_MANUAL' });
        expect(barrera.abrir).toHaveBeenCalledTimes(1);
        expect(barrera.denegar).toHaveBeenCalledTimes(1);
        expect(await estado.obtener()).toMatchObject({
          ultimaLectura: null,
          requiereValidacionManual: true,
        });
      },
    );
  },
);

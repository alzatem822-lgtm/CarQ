import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { LectorManual } from '../../vehiculos/infraestructura/lector-manual';
import { EstadoCarrilEnMemoriaStore } from '../infraestructura/estado-carril-en-memoria.store';
import {
  ConfirmarLecturaManual,
  type SolicitudConfirmacionManual,
} from './confirmar-lectura-manual';
import { ProcesarIngreso } from './procesar-ingreso';
import { ProcesarSalida } from './procesar-salida';

describe('ConfirmarLecturaManual (CARQ-148)', () => {
  function preparar() {
    const lectorCaptura = {
      leer: jest.fn().mockRejectedValue(new Error('OCR no disponible')),
    };
    const transaccion = {
      ejecutar: jest
        .fn()
        .mockResolvedValue({ resultado: 'AUTORIZADO', motivo: 'Autorizado' }),
    };
    const barrera = {
      abrir: jest.fn(),
      denegar: jest.fn(),
      consultarEstado: jest.fn(),
    };
    const estado = new EstadoCarrilEnMemoriaStore();
    const reloj = new RelojFijo(new Date('2026-11-23T15:00:00Z'));
    const confirmar = new ConfirmarLecturaManual(
      new LectorManual(),
      new ProcesarIngreso(lectorCaptura, reloj, transaccion, estado, barrera),
      new ProcesarSalida(lectorCaptura, reloj, transaccion, estado, barrera),
    );
    const solicitud: SolicitudConfirmacionManual = {
      sedeId: 1,
      carrilId: 2,
      sentido: 'ENTRADA',
      placa: ' abc-12 a ',
      operador: 'operador',
    };
    return {
      confirmar,
      solicitud,
      lectorCaptura,
      transaccion,
      barrera,
      estado,
    };
  }

  it.each(['ENTRADA', 'SALIDA'] as const)(
    'continúa %s con origen manual sin consultar el lector de capturas',
    async (sentido) => {
      const { confirmar, solicitud, lectorCaptura, transaccion, estado } =
        preparar();
      await confirmar.ejecutar({ ...solicitud, sentido });
      expect(lectorCaptura.leer).not.toHaveBeenCalled();
      expect(transaccion.ejecutar).toHaveBeenCalledWith(
        expect.objectContaining({
          operador: 'operador',
          lectura: expect.objectContaining({ origen: 'MANUAL', confianza: 1 }),
        }),
      );
      expect(await estado.obtener()).toMatchObject({
        sentido,
        requiereValidacionManual: false,
        ultimaLectura: { placa: 'ABC12A', confianza: 1, origen: 'MANUAL' },
      });
    },
  );

  it.each([
    { placa: 'XX' },
    { placa: '' },
    { operador: '  ' },
    { sentido: 'OTRO' },
  ])(
    'rechaza confirmación inválida sin transacción ni barrera: %j',
    async (cambio) => {
      const { confirmar, solicitud, transaccion, barrera } = preparar();
      await expect(
        confirmar.ejecutar({
          ...solicitud,
          ...cambio,
        } as SolicitudConfirmacionManual),
      ).rejects.toThrow();
      expect(transaccion.ejecutar).not.toHaveBeenCalled();
      expect(barrera.abrir).not.toHaveBeenCalled();
      expect(barrera.denegar).not.toHaveBeenCalled();
    },
  );

  it('propaga el rollback sin confirmar apertura', async () => {
    const { confirmar, solicitud, transaccion, barrera } = preparar();
    const fallo = new Error('Rollback');
    transaccion.ejecutar.mockRejectedValue(fallo);
    await expect(confirmar.ejecutar(solicitud)).rejects.toBe(fallo);
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it('expone un fallo de barrera posterior al commit sin repetir la transacción', async () => {
    const { confirmar, solicitud, transaccion, barrera } = preparar();
    barrera.abrir.mockRejectedValue(new Error('Sin conexión'));
    await expect(confirmar.ejecutar(solicitud)).rejects.toMatchObject({
      codigo: 'BARRERA_NO_DISPONIBLE',
    });
    expect(transaccion.ejecutar).toHaveBeenCalledTimes(1);
  });
});

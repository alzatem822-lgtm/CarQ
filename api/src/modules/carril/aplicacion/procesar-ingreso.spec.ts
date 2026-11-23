import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { LectorSimulado } from '../../vehiculos/infraestructura/lector-simulado';
import { EstadoCarrilEnMemoriaStore } from '../infraestructura/estado-carril-en-memoria.store';
import { ProcesarIngreso } from './procesar-ingreso';

describe('ProcesarIngreso', () => {
  const instante = new Date('2026-11-23T15:00:00Z');
  it('ordena apertura solo después de confirmar la transacción', async () => {
    const orden: string[] = [];
    const transaccion = {
      ejecutar: jest.fn(async () => {
        orden.push('commit');
        return {
          resultado: 'AUTORIZADO' as const,
          motivo: 'Ingreso autorizado',
        };
      }),
    };
    const barrera = {
      abrir: jest.fn(async () => {
        orden.push('abrir');
      }),
      denegar: jest.fn(),
      consultarEstado: jest.fn(),
    };
    const estado = new EstadoCarrilEnMemoriaStore();
    await new ProcesarIngreso(
      new LectorSimulado(),
      new RelojFijo(instante),
      transaccion,
      estado,
      barrera,
    ).ejecutar(1, 2, { placa: 'ABC123', confianza: 0.9 }, 'operador');
    expect(orden).toEqual(['commit', 'abrir']);
    expect(transaccion.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({ operador: 'operador' }),
    );
    expect((await estado.obtener()).ultimoResultado?.resultado).toBe(
      'AUTORIZADO',
    );
  });
  it('no ordena barrera si falla la transacción', async () => {
    const barrera = {
      abrir: jest.fn(),
      denegar: jest.fn(),
      consultarEstado: jest.fn(),
    };
    const error = new Error('Rollback');
    await expect(
      new ProcesarIngreso(
        new LectorSimulado(),
        new RelojFijo(instante),
        { ejecutar: () => Promise.reject(error) },
        new EstadoCarrilEnMemoriaStore(),
        barrera,
      ).ejecutar(1, 1, { placa: 'ABC123', confianza: 1 }),
    ).rejects.toBe(error);
    expect(barrera.abrir).not.toHaveBeenCalled();
    expect(barrera.denegar).not.toHaveBeenCalled();
  });
  it('expone el fallo de barrera posterior al commit sin repetir la transacción', async () => {
    const ejecutar = jest.fn().mockResolvedValue({
      resultado: 'AUTORIZADO',
      motivo: 'Ingreso autorizado',
    });
    await expect(
      new ProcesarIngreso(
        new LectorSimulado(),
        new RelojFijo(instante),
        { ejecutar },
        new EstadoCarrilEnMemoriaStore(),
        {
          abrir: () => Promise.reject(new Error('Sin conexión')),
          denegar: jest.fn(),
          consultarEstado: jest.fn(),
        },
      ).ejecutar(1, 1, { placa: 'ABC123', confianza: 1 }),
    ).rejects.toMatchObject({ codigo: 'BARRERA_NO_DISPONIBLE' });
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });
});

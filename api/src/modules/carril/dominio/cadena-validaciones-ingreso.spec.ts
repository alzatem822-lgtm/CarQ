import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { Cupo } from '../../configuracion/dominio/cupo';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import {
  CadenaValidacionesIngreso,
  ValidarLecturaIngreso,
  ValidarCupoIngreso,
} from './cadena-validaciones-ingreso';

describe('CadenaValidacionesIngreso', () => {
  const cadena = new CadenaValidacionesIngreso([
    new ValidarLecturaIngreso(),
    new ValidarCupoIngreso(),
  ]);
  it('detiene la lectura inválida antes de consultar cupos', async () => {
    const consultarCupo = jest.fn();
    expect(
      await cadena.evaluar({
        lectura: { placa: null, confianza: 1, origen: 'SIMULADO' },
        umbral: UmbralConfianza.crear(0.8),
        consultarCupo,
      }),
    ).toMatchObject({ resultado: 'REQUIERE_LECTURA_MANUAL' });
    expect(consultarCupo).not.toHaveBeenCalled();
  });
  it.each([
    [0, null],
    [1, 'LLENO'],
    [2, 'LLENO'],
  ] as const)(
    'evalúa ocupación %s con máximo uno',
    async (ocupacion, motivo) => {
      const resultado = await cadena.evaluar({
        lectura: {
          placa: Placa.crear('ABC123'),
          confianza: 0.8,
          origen: 'SIMULADO',
        },
        umbral: UmbralConfianza.crear(0.8),
        consultarCupo: () =>
          Promise.resolve({
            cupo: Cupo.crear('1', TipoVehiculo.CARRO, 1),
            ocupacion,
          }),
      });
      expect(resultado?.motivo ?? null).toBe(motivo);
    },
  );
  it('permite añadir otro eslabón sin modificar los existentes', async () => {
    const evaluar = jest
      .fn()
      .mockResolvedValue({
        resultado: 'RECHAZADO',
        motivo: 'Validación adicional',
      });
    expect(
      await new CadenaValidacionesIngreso([{ evaluar }]).evaluar({
        lectura: { placa: null, confianza: 0, origen: 'SIMULADO' },
        umbral: UmbralConfianza.crear(0.8),
        consultarCupo: jest.fn(),
      }),
    ).toMatchObject({ motivo: 'Validación adicional' });
  });
});

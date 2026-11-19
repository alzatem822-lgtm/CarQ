import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Franja } from '../../configuracion/dominio/franja';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { Tarifa } from '../../configuracion/dominio/tarifa';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cobro } from '../dominio/cobro';
import { RegistroEstrategiasTarifa } from '../dominio/estrategia-tarifa';
import { tarifaCarro, tarifaMoto } from '../dominio/tarifa-por-franja';
import { CobroRepository } from './cobro.repository';
import { GenerarCobro } from './generar-cobro';

const placa = Placa.crear('ABC123');
const ingresoEn = new Date('2026-11-19T14:00:00.000Z');

function preparar(existente: Cobro | null = null) {
  const cobros: CobroRepository = {
    buscarPorPlacaYDia: jest.fn().mockResolvedValue(existente),
    guardar: jest.fn((cobro: Cobro) => Promise.resolve(cobro)),
    listarPendientes: jest.fn(),
    buscarPorId: jest.fn(),
    actualizarEstado: jest.fn(),
  };
  const generar = new GenerarCobro(
    cobros,
    {
      obtener: () => Promise.resolve(Franja.diurna(6, 18)),
      guardar: jest.fn(),
    },
    {
      obtenerTodas: () =>
        Promise.resolve([
          Tarifa.crear('1', TipoVehiculo.CARRO, 'DIURNA', 5000),
          Tarifa.crear('1', TipoVehiculo.MOTO, 'DIURNA', 0),
        ]),
      guardarTodas: jest.fn(),
    },
    new DiaOperativo(),
    new ResolverFranja(),
    new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]),
  );
  return { generar, cobros };
}

describe('GenerarCobro', () => {
  it('crea un pendiente con la tarifa del ingreso diurno', async () => {
    const { generar } = preparar();
    const cobro = await generar.ejecutar({
      placa,
      sedeId: 1,
      tipoVehiculo: TipoVehiculo.CARRO,
      ingresoEn,
    });
    expect(cobro?.estado).toBe('PENDIENTE');
    expect(cobro?.tarifaAplicada).toBe(5000);
  });

  it('no crea un cobro por tarifa cero', async () => {
    const { generar, cobros } = preparar();
    const cobro = await generar.ejecutar({
      placa: Placa.crear('ABC12A'),
      sedeId: 1,
      tipoVehiculo: TipoVehiculo.MOTO,
      ingresoEn,
    });
    expect(cobro).toBeNull();
    expect(cobros.guardar).not.toHaveBeenCalled();
  });

  it('conserva el importe histórico de un cobro existente', async () => {
    const tipoVehiculo = TipoVehiculo.CARRO;
    const existente = Cobro.crear({
      placa,
      sedeId: 1,
      tipoVehiculo,
      diaOperativo: '2026-11-19',
      franja: 'DIURNA',
      tarifaAplicada: 4200,
    });
    const { generar, cobros } = preparar(existente);
    await expect(
      generar.ejecutar({ placa, sedeId: 1, tipoVehiculo, ingresoEn }),
    ).resolves.toBe(existente);
    expect(cobros.guardar).not.toHaveBeenCalled();
  });
});

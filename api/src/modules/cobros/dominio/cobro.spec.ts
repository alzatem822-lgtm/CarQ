import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cobro } from './cobro';

const nuevo = () =>
  Cobro.crear({
    placa: Placa.crear('ABC123'),
    tipoVehiculo: TipoVehiculo.CARRO,
    sedeId: 1,
    diaOperativo: '2026-11-19',
    franja: 'DIURNA',
    tarifaAplicada: 5000,
  });

describe('Cobro', () => {
  it('conserva los datos y la tarifa aplicada en el cobro pendiente', () => {
    const cobro = nuevo();
    expect(cobro.id).toBeNull();
    expect(cobro.placa.valor).toBe('ABC123');
    expect(cobro.tipoVehiculo).toBe(TipoVehiculo.CARRO);
    expect(cobro.sedeId).toBe(1);
    expect(cobro.diaOperativo).toBe('2026-11-19');
    expect(cobro.franja).toBe('DIURNA');
    expect(cobro.tarifaAplicada).toBe(5000);
    expect(cobro.estado).toBe('PENDIENTE');
    expect(cobro.motivoAnulacion).toBeNull();
  });
});

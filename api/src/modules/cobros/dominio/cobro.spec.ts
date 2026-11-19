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

  it('permite pagar un pendiente y rechaza devolverlo a pendiente', () => {
    const pagado = nuevo().transicionar('PAGADO');
    expect(pagado.estado).toBe('PAGADO');
    expect(pagado.tarifaAplicada).toBe(5000);
    expect(() => pagado.transicionar('PENDIENTE')).toThrow('pendiente');
  });

  it('conserva la auditoría de anulación y rechaza pagar ese cobro', () => {
    const anulado = nuevo().transicionar('ANULADO', {
      usuario: 'admin',
      motivo: 'Corrección',
    });
    expect(anulado.estado).toBe('ANULADO');
    expect(anulado.anuladoPor).toBe('admin');
    expect(anulado.motivoAnulacion).toBe('Corrección');
    expect(() => anulado.transicionar('PAGADO')).toThrow('pendiente');
  });
});

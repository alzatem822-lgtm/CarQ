import { decidirSalida } from './decision-salida';

describe('DecisionSalida (RN-06)', () => {
  it('deniega la salida cuando el cobro está pendiente', () => {
    expect(decidirSalida('PENDIENTE')).toEqual({
      autoriza: false,
      motivo: 'Cobro pendiente, pasar por caja',
    });
  });

  it('permite la salida cuando el cobro está pagado', () => {
    expect(decidirSalida('PAGADO')).toEqual({
      autoriza: true,
      motivo: 'Cobro pagado',
    });
  });

  it('permite la salida cuando no existe un cobro exigible', () => {
    expect(decidirSalida(null)).toEqual({
      autoriza: true,
      motivo: 'Sin cobro exigible',
    });
  });

  it('deniega la salida con un motivo propio cuando el cobro está anulado', () => {
    expect(decidirSalida('ANULADO')).toEqual({
      autoriza: false,
      motivo: 'Cobro anulado, requiere revisión',
    });
  });
});

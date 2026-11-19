import { Pago } from './pago';

describe('Pago', () => {
  it('conserva la referencia, el cobro, el importe y la identidad del operador', () => {
    const fecha = new Date('2026-11-19T15:00Z');
    const pago = Pago.crear({
      cobroId: 1,
      referencia: 'efectivo-1',
      monto: 5000,
      operador: 'operador',
      fecha,
    });
    expect(pago.id).toBeNull();
    expect(pago.cobroId).toBe(1);
    expect(pago.referencia).toBe('efectivo-1');
    expect(pago.monto).toBe(5000);
    expect(pago.operador).toBe('operador');
    expect(pago.fecha).toEqual(fecha);
  });
});

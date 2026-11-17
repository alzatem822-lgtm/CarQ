import { estadoCarrilInicial } from './estado-carril';

describe('estadoCarrilInicial', () => {
  it('representa el carril libre con la barrera cerrada', () => {
    const estado = estadoCarrilInicial();

    expect(estado.vehiculoPresente).toBe(false);
    expect(estado.sentido).toBeNull();
    expect(estado.ultimaLectura).toBeNull();
    expect(estado.barrera).toEqual({ estado: 'CERRADA', motivo: null });
    expect(estado.requiereValidacionManual).toBe(false);
  });

  it('devuelve un objeto nuevo en cada llamada', () => {
    expect(estadoCarrilInicial()).not.toBe(estadoCarrilInicial());
  });
});
import { EstadoCarril, estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from './estado-carril-en-memoria.store';

describe('EstadoCarrilEnMemoriaStore', () => {
  it('devuelve el estado inicial si no se ha guardado nada', async () => {
    const store = new EstadoCarrilEnMemoriaStore();

    expect(await store.obtener()).toEqual(estadoCarrilInicial());
  });

  it('guarda y lee el último estado', async () => {
    const store = new EstadoCarrilEnMemoriaStore();
    const estado: EstadoCarril = {
      vehiculoPresente: true,
      sentido: 'ENTRADA',
      ultimaLectura: { placa: 'ABC123', confianza: 0.95, origen: 'SIMULADO' },
      ultimoResultado: {
        resultado: 'AUTORIZADO',
        motivo: 'Ingreso autorizado',
      },
      barrera: { estado: 'ABIERTA', motivo: 'Ingreso autorizado' },
      requiereValidacionManual: false,
    };

    await store.guardar(estado);

    expect(await store.obtener()).toEqual(estado);
  });

  it('reemplaza el estado anterior al guardar uno nuevo', async () => {
    const store = new EstadoCarrilEnMemoriaStore();
    await store.guardar({ ...estadoCarrilInicial(), vehiculoPresente: true });

    await store.guardar(estadoCarrilInicial());

    expect((await store.obtener()).vehiculoPresente).toBe(false);
  });
});

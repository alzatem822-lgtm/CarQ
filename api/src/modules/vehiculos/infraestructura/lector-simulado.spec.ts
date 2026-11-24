import { LectorSimulado } from './lector-simulado';

describe('LectorSimulado', () => {
  const lector = new LectorSimulado();

  it('devuelve la placa y la confianza recibidas con origen SIMULADO', async () => {
    const lectura = await lector.leer({ placa: 'ABC123', confianza: 0.92 });

    expect(lectura.placa?.valor).toBe('ABC123');
    expect(lectura.confianza).toBe(0.92);
    expect(lectura.origen).toBe('SIMULADO');
  });

  it('normaliza mayúsculas, espacios y guiones', async () => {
    const lectura = await lector.leer({ placa: 'abc-12 a', confianza: 0.8 });

    expect(lectura.placa?.valor).toBe('ABC12A');
  });

  it('devuelve placa nula si el formato es inválido', async () => {
    const lectura = await lector.leer({ placa: 'XX', confianza: 0.9 });

    expect(lectura.placa).toBeNull();
    expect(lectura.confianza).toBe(0.9);
    expect(lectura.origen).toBe('SIMULADO');
  });

  it('devuelve placa nula y confianza 0 si no se indica nada', async () => {
    const lectura = await lector.leer({});

    expect(lectura.placa).toBeNull();
    expect(lectura.confianza).toBe(0);
  });
});
import { DataSource } from 'typeorm';
import { obtenerIdSedePrincipal } from './sede-principal';

function origenCon(filas: { id: number }[]): DataSource {
  return { query: () => Promise.resolve(filas) } as unknown as DataSource;
}

describe('obtenerIdSedePrincipal', () => {
  it('devuelve el id de la sede como texto', async () => {
    await expect(obtenerIdSedePrincipal(origenCon([{ id: 4 }]))).resolves.toBe(
      '4',
    );
  });

  it('falla con un mensaje claro si no hay sede', async () => {
    await expect(obtenerIdSedePrincipal(origenCon([]))).rejects.toThrow(
      'falta ejecutar el seed',
    );
  });
});
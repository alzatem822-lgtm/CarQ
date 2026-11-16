import { DataSource } from 'typeorm';
import { Franja } from '../dominio/franja';
import { FranjaPostgresRepository } from './franja-postgres.repository';

function origenFalso(filas: unknown[] = []) {
  const consultas: { sql: string; parametros: unknown[] }[] = [];
  const origen = {
    query: (sql: string, parametros: unknown[] = []) => {
      consultas.push({ sql, parametros });
      return Promise.resolve(filas);
    },
  };
  return { origen: origen as unknown as DataSource, consultas };
}

describe('FranjaPostgresRepository', () => {
  it('lee la franja y la convierte a objeto de valor', async () => {
    const { origen } = origenFalso([{ inicio_hora: 6, fin_hora: 18 }]);
    const franja = await new FranjaPostgresRepository(origen).obtener();
    expect(franja.inicioHora).toBe(6);
    expect(franja.finHora).toBe(18);
    expect(franja.tipoDe(17)).toBe('DIURNA');
    expect(franja.tipoDe(18)).toBe('NOCTURNA');
  });

  it('falla con un mensaje claro si no hay franja configurada', async () => {
    const { origen } = origenFalso([]);
    await expect(new FranjaPostgresRepository(origen).obtener()).rejects.toThrow(
      'franja configurada',
    );
  });

  it('guarda el inicio y el fin con SQL', async () => {
    const { origen, consultas } = origenFalso();
    await new FranjaPostgresRepository(origen).guardar(Franja.diurna(7, 19));
    expect(consultas).toHaveLength(1);
    expect(consultas[0].sql).toContain('INSERT INTO franja');
    expect(consultas[0].parametros).toEqual([7, 19]);
  });
});

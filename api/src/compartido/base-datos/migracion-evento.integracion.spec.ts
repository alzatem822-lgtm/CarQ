import { DataSource } from 'typeorm';
import { iniciarBaseDatosPruebas } from '../pruebas/base-datos-pruebas';

describe('Migración CrearEvento (integración)', () => {
  let origen: DataSource;

  async function existeTablaEvento(): Promise<boolean> {
    const filas = await origen.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'evento'`,
    );
    return filas.length > 0;
  }

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
  }, 30000);

  afterAll(async () => {
    await origen.destroy();
  });

  it('se aplica: la tabla evento existe con sus columnas', async () => {
    expect(await existeTablaEvento()).toBe(true);

    const columnas = await origen.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'evento'`,
    );
    const nombres = columnas.map((c: { column_name: string }) => c.column_name);

    expect(nombres).toEqual(
      expect.arrayContaining([
        'id',
        'sede_id',
        'carril_id',
        'placa',
        'sentido',
        'resultado',
        'motivo',
        'confianza',
        'origen',
        'lectura_manual',
        'ocurrido_en',
      ]),
    );
  });

  it('se revierte y se vuelve a aplicar', async () => {
    while (await existeTablaEvento()) {
      await origen.undoLastMigration();
    }
    expect(await existeTablaEvento()).toBe(false);

    await origen.runMigrations();
    expect(await existeTablaEvento()).toBe(true);
  });
});
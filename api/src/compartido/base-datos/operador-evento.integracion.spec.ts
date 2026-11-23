import type { DataSource, QueryRunner } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../pruebas/base-datos-pruebas';
import { AgregarOperadorEvento1795464000000 } from './migraciones/1795464000000-AgregarOperadorEvento';

describe('Migración de operador en eventos (CARQ-129/132)', () => {
  let db: DataSource;
  let gestor: QueryRunner;
  const migracion = new AgregarOperadorEvento1795464000000();
  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    gestor = db.createQueryRunner();
    await gestor.connect();
  }, 30000);
  afterAll(async () => {
    await gestor?.release();
    if (db?.isInitialized) await db.destroy();
  });

  it('conserva eventos históricos sin inventar autoría y permite revertir y reaplicar', async () => {
    await limpiarBaseDatosPruebas(db);
    await gestor.startTransaction();
    try {
      await migracion.down(gestor);
      await gestor.query("INSERT INTO sede (nombre) VALUES ('Sede histórica')");
      await gestor.query(
        "INSERT INTO carril (sede_id, nombre) VALUES (1, 'Carril histórico')",
      );
      await gestor.query(`INSERT INTO evento (sede_id, carril_id, placa, sentido, resultado, motivo, origen, lectura_manual, ocurrido_en)
        VALUES (1, 1, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Histórico', 'MANUAL', true, '2026-11-19T15:00Z')`);
      await migracion.up(gestor);
      expect(await gestor.query('SELECT placa, operador FROM evento')).toEqual([
        { placa: 'ABC123', operador: null },
      ]);
      await migracion.down(gestor);
      await migracion.up(gestor);
      expect(
        await gestor.query('SELECT count(*)::int total FROM evento'),
      ).toEqual([{ total: 1 }]);
    } finally {
      await gestor.rollbackTransaction();
    }
  });

  it('rechaza identidades inexistentes o vacías al persistir', async () => {
    await limpiarBaseDatosPruebas(db);
    await db.query("INSERT INTO sede (nombre) VALUES ('Sede')");
    await db.query("INSERT INTO carril (sede_id, nombre) VALUES (1, 'Carril')");
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('', 'hash', 'OPERADOR')",
    );
    const sql = `INSERT INTO evento (sede_id, carril_id, sentido, resultado, motivo, origen, lectura_manual, ocurrido_en, operador)
      VALUES (1, 1, 'ENTRADA', 'AUTORIZADO', 'Ingreso', 'MANUAL', true, now(), $1)`;
    await expect(db.query(sql, ['no-existe'])).rejects.toMatchObject({
      driverError: { code: '23503' },
    });
    await expect(db.query(sql, [''])).rejects.toMatchObject({
      driverError: { code: '23514' },
    });
  });
});

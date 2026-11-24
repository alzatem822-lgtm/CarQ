import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CARQ-65. Parámetros por sede. Hoy solo guarda el umbral de confianza
 * del lector de placas (F-06). Una fila por sede.
 *
 * El CHECK repite en la base de datos la regla de UmbralConfianza
 * (valor entre 0 y 1), de modo que ningún acceso directo a la tabla
 * pueda dejar un valor fuera de rango.
 */
export class CrearParametroSede1794848280000 implements MigrationInterface {
  name = 'CrearParametroSede1794848280000';

  public async up(consulta: QueryRunner): Promise<void> {
    await consulta.query(`
      CREATE TABLE parametro_sede (
        sede_id INTEGER PRIMARY KEY,
        umbral_confianza NUMERIC(3, 2) NOT NULL,
        CONSTRAINT fk_parametro_sede_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT ck_parametro_sede_umbral_confianza
          CHECK (umbral_confianza BETWEEN 0 AND 1)
      )
    `);
  }

  public async down(consulta: QueryRunner): Promise<void> {
    await consulta.query(`DROP TABLE parametro_sede`);
  }
}
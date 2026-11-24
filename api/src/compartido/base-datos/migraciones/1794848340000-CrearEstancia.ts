import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEstancia1794848340000 implements MigrationInterface {
  name = 'CrearEstancia1794848340000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE estancia (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(10) NOT NULL,
        sede_id INTEGER NOT NULL,
        carril_id INTEGER NOT NULL,
        tipo_vehiculo VARCHAR(20) NOT NULL,
        ingreso_en TIMESTAMPTZ NOT NULL,
        salida_en TIMESTAMPTZ NULL,
        CONSTRAINT fk_estancia_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT fk_estancia_carril FOREIGN KEY (carril_id) REFERENCES carril (id),
        CONSTRAINT ck_estancia_salida CHECK (salida_en IS NULL OR salida_en >= ingreso_en)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX ix_estancia_ocupacion
        ON estancia (sede_id, tipo_vehiculo)
        WHERE salida_en IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_estancia_placa_sede_abierta
        ON estancia (placa, sede_id)
        WHERE salida_en IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE estancia`);
  }
}
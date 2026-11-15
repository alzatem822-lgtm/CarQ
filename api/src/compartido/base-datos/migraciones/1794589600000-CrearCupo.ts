import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearCupo1794589600000 implements MigrationInterface {
  name = 'CrearCupo1794589600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cupo (
        id SERIAL PRIMARY KEY,
        sede_id INTEGER NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        maximo INTEGER NOT NULL,
        CONSTRAINT fk_cupo_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT ck_cupo_maximo CHECK (maximo >= 0),
        CONSTRAINT uq_cupo_sede_tipo UNIQUE (sede_id, tipo)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE cupo`);
  }
}
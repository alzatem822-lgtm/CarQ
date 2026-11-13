import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearSedeYCarril1794589500000 implements MigrationInterface {
  name = 'CrearSedeYCarril1794589500000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE sede (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        CONSTRAINT uq_sede_nombre UNIQUE (nombre)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE carril (
        id SERIAL PRIMARY KEY,
        sede_id INTEGER NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        CONSTRAINT fk_carril_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT uq_carril_sede_nombre UNIQUE (sede_id, nombre)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE carril`);
    await queryRunner.query(`DROP TABLE sede`);
  }
}
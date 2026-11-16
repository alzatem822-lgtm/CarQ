import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearFranja1794589800000 implements MigrationInterface {
  name = 'CrearFranja1794589800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE franja (
        sede_id INTEGER PRIMARY KEY,
        inicio_hora INTEGER NOT NULL,
        fin_hora INTEGER NOT NULL,
        CONSTRAINT fk_franja_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT ck_franja_inicio CHECK (inicio_hora BETWEEN 0 AND 23),
        CONSTRAINT ck_franja_fin CHECK (fin_hora BETWEEN 1 AND 24),
        CONSTRAINT ck_franja_orden CHECK (inicio_hora < fin_hora)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE franja`);
  }
}
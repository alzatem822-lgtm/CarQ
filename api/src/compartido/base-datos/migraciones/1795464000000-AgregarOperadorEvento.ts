import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarOperadorEvento1795464000000 implements MigrationInterface {
  name = 'AgregarOperadorEvento1795464000000';

  async up(gestor: QueryRunner): Promise<void> {
    // NULL conserva honestamente la autoría desconocida de los eventos históricos.
    await gestor.query(`ALTER TABLE evento
      ADD COLUMN operador VARCHAR(100),
      ADD CONSTRAINT fk_evento_operador FOREIGN KEY (operador) REFERENCES usuario(nombre),
      ADD CONSTRAINT ck_evento_operador CHECK (operador IS NULL OR btrim(operador) <> '')`);
  }

  async down(gestor: QueryRunner): Promise<void> {
    await gestor.query(`ALTER TABLE evento
      DROP CONSTRAINT ck_evento_operador,
      DROP CONSTRAINT fk_evento_operador,
      DROP COLUMN operador`);
  }
}

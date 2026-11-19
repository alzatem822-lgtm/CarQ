import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearPago1794848460000 implements MigrationInterface {
  name = 'CrearPago1794848460000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE pago (
        id SERIAL PRIMARY KEY,
        cobro_id INTEGER NOT NULL REFERENCES cobro(id),
        referencia VARCHAR(100) NOT NULL CHECK (btrim(referencia) <> ''),
        monto INTEGER NOT NULL CHECK (monto > 0),
        operador VARCHAR(100) NOT NULL REFERENCES usuario(nombre),
        fecha TIMESTAMPTZ NOT NULL,
        CONSTRAINT uq_pago_referencia UNIQUE (referencia),
        CONSTRAINT uq_pago_cobro UNIQUE (cobro_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE pago');
  }
}

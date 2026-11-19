import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearCobro1794848400000 implements MigrationInterface {
  name = 'CrearCobro1794848400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cobro (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(6) NOT NULL,
        tipo_vehiculo VARCHAR(20) NOT NULL,
        sede_id INTEGER NOT NULL REFERENCES sede(id),
        dia_operativo DATE NOT NULL,
        franja VARCHAR(10) NOT NULL CHECK (franja IN ('DIURNA', 'NOCTURNA')),
        tarifa_aplicada INTEGER NOT NULL CHECK (tarifa_aplicada > 0),
        estado VARCHAR(10) NOT NULL DEFAULT 'PENDIENTE'
          CHECK (estado IN ('PENDIENTE', 'PAGADO', 'ANULADO')),
        anulado_por VARCHAR(100) REFERENCES usuario(nombre),
        motivo_anulacion TEXT,
        CONSTRAINT uq_cobro_placa_sede_dia UNIQUE (placa, sede_id, dia_operativo),
        CONSTRAINT ck_cobro_anulacion CHECK (
          (estado = 'ANULADO' AND anulado_por IS NOT NULL
            AND motivo_anulacion IS NOT NULL AND btrim(motivo_anulacion) <> '')
          OR (estado <> 'ANULADO' AND anulado_por IS NULL AND motivo_anulacion IS NULL)
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE cobro');
  }
}

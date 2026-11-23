import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IndexarConsultas1795456800000 implements MigrationInterface {
  name = 'IndexarConsultas1795456800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX ix_evento_sede_fecha
        ON evento (sede_id, ocurrido_en DESC, id DESC);
      CREATE INDEX ix_evento_sede_placa_fecha
        ON evento (sede_id, placa, ocurrido_en DESC, id DESC);
      CREATE INDEX ix_evento_sede_resultado_fecha
        ON evento (sede_id, resultado, ocurrido_en DESC, id DESC);
      CREATE INDEX ix_cobro_sede_dia
        ON cobro (sede_id, dia_operativo DESC, id DESC);
      CREATE INDEX ix_cobro_sede_estado_dia
        ON cobro (sede_id, estado, dia_operativo DESC, id DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX ix_evento_sede_fecha, ix_evento_sede_placa_fecha,
        ix_evento_sede_resultado_fecha, ix_cobro_sede_dia, ix_cobro_sede_estado_dia
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearEvento1794848340000 implements MigrationInterface {
  name = 'CrearEvento1794848340000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE evento (
        id SERIAL PRIMARY KEY,
        sede_id INTEGER NOT NULL,
        carril_id INTEGER NOT NULL,
        placa VARCHAR(10),
        sentido VARCHAR(10) NOT NULL,
        resultado VARCHAR(30) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        confianza DOUBLE PRECISION,
        origen VARCHAR(10) NOT NULL,
        lectura_manual BOOLEAN NOT NULL DEFAULT FALSE,
        ocurrido_en TIMESTAMPTZ NOT NULL,
        CONSTRAINT fk_evento_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT fk_evento_carril FOREIGN KEY (carril_id) REFERENCES carril (id),
        CONSTRAINT ck_evento_sentido CHECK (sentido IN ('ENTRADA', 'SALIDA')),
        CONSTRAINT ck_evento_resultado CHECK (resultado IN ('AUTORIZADO', 'RECHAZADO', 'REQUIERE_LECTURA_MANUAL')),
        CONSTRAINT ck_evento_motivo CHECK (btrim(motivo) <> ''),
        CONSTRAINT ck_evento_origen CHECK (origen IN ('SIMULADO', 'MANUAL', 'OCR')),
        CONSTRAINT ck_evento_confianza CHECK (confianza IS NULL OR (confianza >= 0 AND confianza <= 1))
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE evento`);
  }
}
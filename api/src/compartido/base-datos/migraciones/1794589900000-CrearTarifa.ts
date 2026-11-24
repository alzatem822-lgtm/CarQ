import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearTarifa1794589900000 implements MigrationInterface {
  name = 'CrearTarifa1794589900000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tarifa (
        sede_id INTEGER NOT NULL,
        tipo_vehiculo VARCHAR(20) NOT NULL,
        franja VARCHAR(10) NOT NULL,
        valor INTEGER NOT NULL,
        CONSTRAINT pk_tarifa PRIMARY KEY (sede_id, tipo_vehiculo, franja),
        CONSTRAINT fk_tarifa_sede FOREIGN KEY (sede_id) REFERENCES sede (id),
        CONSTRAINT ck_tarifa_franja CHECK (franja IN ('DIURNA', 'NOCTURNA')),
        CONSTRAINT ck_tarifa_valor CHECK (valor >= 0)
      )
    `);
    await queryRunner.query(`
      CREATE FUNCTION validar_tarifa_nocturna_menor() RETURNS trigger AS $$
      DECLARE
        v_diurna INTEGER;
        v_nocturna INTEGER;
      BEGIN
        SELECT valor INTO v_diurna FROM tarifa
          WHERE sede_id = NEW.sede_id
            AND tipo_vehiculo = NEW.tipo_vehiculo
            AND franja = 'DIURNA';
        SELECT valor INTO v_nocturna FROM tarifa
          WHERE sede_id = NEW.sede_id
            AND tipo_vehiculo = NEW.tipo_vehiculo
            AND franja = 'NOCTURNA';
        IF v_diurna IS NOT NULL AND v_nocturna IS NOT NULL
           AND NOT (v_diurna = 0 AND v_nocturna = 0)
           AND v_nocturna >= v_diurna THEN
          RAISE EXCEPTION 'RN-02: la tarifa nocturna debe ser menor que la diurna (sede %, tipo %)',
            NEW.sede_id, NEW.tipo_vehiculo
            USING ERRCODE = 'check_violation';
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE CONSTRAINT TRIGGER tr_tarifa_rn02
        AFTER INSERT OR UPDATE ON tarifa
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION validar_tarifa_nocturna_menor()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tarifa`);
    await queryRunner.query(`DROP FUNCTION validar_tarifa_nocturna_menor()`);
  }
}
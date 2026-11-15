import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearUsuario1794589700000 implements MigrationInterface {
  name = 'CrearUsuario1794589700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuario (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        hash_contrasena VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL,
        CONSTRAINT ck_usuario_rol CHECK (rol IN ('OPERADOR', 'ADMINISTRADOR'))
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_usuario_nombre ON usuario (nombre)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE usuario`);
  }
}
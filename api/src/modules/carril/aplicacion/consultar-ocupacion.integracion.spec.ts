import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { CupoPostgresRepository } from '../../configuracion/infraestructura/cupo-postgres.repository';
import { EstanciaPostgresRepository } from '../infraestructura/estancia-postgres.repository';
import { ConsultarOcupacion } from './consultar-ocupacion';

describe('ConsultarOcupacion con PostgreSQL real', () => {
  let origen: DataSource;
  let consultar: ConsultarOcupacion;

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    consultar = new ConsultarOcupacion(
      new CupoPostgresRepository(origen),
      new EstanciaPostgresRepository(origen),
    );
  }, 30000);

  afterAll(async () => {
    if (origen?.isInitialized) await origen.destroy();
  });

  it('combina máximos persistidos y estancias abiertas sin mezclar sedes ni contar salidas', async () => {
    await limpiarBaseDatosPruebas(origen);
    const sedes: { id: number }[] = await origen.query(
      `INSERT INTO sede (nombre) VALUES ('Sede ocupacion'), ('Otra sede') RETURNING id`,
    );
    const sedeId = sedes[0].id;
    const otraSedeId = sedes[1].id;
    const [carril]: { id: number }[] = await origen.query(
      `INSERT INTO carril (sede_id, nombre) VALUES ($1, 'Carril ocupacion') RETURNING id`,
      [sedeId],
    );
    const [otroCarril]: { id: number }[] = await origen.query(
      `INSERT INTO carril (sede_id, nombre) VALUES ($1, 'Otro carril') RETURNING id`,
      [otraSedeId],
    );
    await origen.query(
      `INSERT INTO cupo (sede_id, tipo, maximo)
       VALUES ($1, 'CARRO', 3), ($1, 'MOTO', 5), ($2, 'CARRO', 20)`,
      [sedeId, otraSedeId],
    );
    await origen.query(
      `INSERT INTO estancia (placa, sede_id, carril_id, tipo_vehiculo, ingreso_en, salida_en)
       VALUES ('ABC123', $1, $2, 'CARRO', '2026-11-19T12:00:00Z', NULL),
              ('DEF456', $1, $2, 'CARRO', '2026-11-19T12:00:00Z', '2026-11-19T13:00:00Z'),
              ('ABC12D', $1, $2, 'MOTO', '2026-11-19T12:00:00Z', NULL),
              ('GHI789', $3, $4, 'CARRO', '2026-11-19T12:00:00Z', NULL)`,
      [sedeId, carril.id, otraSedeId, otroCarril.id],
    );

    expect(await consultar.ejecutar(sedeId)).toEqual([
      { tipoVehiculo: 'CARRO', ocupacion: 1, maximo: 3 },
      { tipoVehiculo: 'MOTO', ocupacion: 1, maximo: 5 },
    ]);

    await origen.query(
      `UPDATE estancia SET salida_en = '2026-11-19T14:00:00Z'
       WHERE sede_id = $1 AND placa = 'ABC123'`,
      [sedeId],
    );
    await origen.query(
      `UPDATE cupo SET maximo = 0 WHERE sede_id = $1 AND tipo = 'CARRO'`,
      [sedeId],
    );

    expect(await consultar.ejecutar(sedeId)).toEqual([
      { tipoVehiculo: 'CARRO', ocupacion: 0, maximo: 0 },
      { tipoVehiculo: 'MOTO', ocupacion: 1, maximo: 5 },
    ]);
  });
});

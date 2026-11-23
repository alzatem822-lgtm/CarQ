import type { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { Placa } from '../../vehiculos/dominio/placa';
import { ConsultaCobrosPostgresRepository } from './consulta-cobros-postgres.repository';
import { ConsultaEventosPostgresRepository } from './consulta-eventos-postgres.repository';

describe('Consultas de eventos y cobros en PostgreSQL', () => {
  let origen: DataSource;
  const placa = Placa.crear('ABC123');

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    await origen.query(`
      INSERT INTO sede (nombre) VALUES ('Sede uno'), ('Sede dos');
      INSERT INTO carril (sede_id, nombre) VALUES (1, 'Principal'), (2, 'Principal');
    `);
  });

  afterAll(async () => {
    await origen?.destroy();
  });

  it('combina los filtros de eventos y desempata por id entre páginas', async () => {
    await origen.query(`
      INSERT INTO evento (sede_id, carril_id, placa, sentido, resultado, motivo, origen, ocurrido_en)
      VALUES
        (1, 1, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Entrada', 'SIMULADO', '2026-11-22T10:00Z'),
        (1, 1, 'ABC123', 'SALIDA', 'AUTORIZADO', 'Salida', 'SIMULADO', '2026-11-22T10:00Z'),
        (1, 1, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Fuera del rango', 'SIMULADO', '2026-11-23T00:00Z'),
        (1, 1, 'DEF456', 'ENTRADA', 'AUTORIZADO', 'Otra placa', 'SIMULADO', '2026-11-22T11:00Z'),
        (1, 1, 'ABC123', 'ENTRADA', 'RECHAZADO', 'Rechazo', 'SIMULADO', '2026-11-22T11:00Z'),
        (2, 2, 'ABC123', 'ENTRADA', 'AUTORIZADO', 'Otra sede', 'SIMULADO', '2026-11-22T11:00Z'),
        (1, 1, NULL, 'ENTRADA', 'REQUIERE_LECTURA_MANUAL', 'Sin placa', 'MANUAL', '2026-11-22T11:00Z')
    `);
    const repositorio = new ConsultaEventosPostgresRepository(origen);
    const filtros = {
      sedeId: 1,
      placa,
      desde: new Date('2026-11-22T10:00:00.000Z'),
      hastaExclusivo: new Date('2026-11-23T00:00:00.000Z'),
      resultado: 'AUTORIZADO',
      tamanioPagina: 1,
    } as const;

    const primera = await repositorio.consultar({ ...filtros, pagina: 1 });
    const segunda = await repositorio.consultar({ ...filtros, pagina: 2 });
    const tercera = await repositorio.consultar({ ...filtros, pagina: 3 });

    expect(primera).toMatchObject({
      elementos: [
        {
          id: 2,
          placa: 'ABC123',
          sentido: 'SALIDA',
          ocurridoEn: filtros.desde,
        },
      ],
      haySiguiente: true,
    });
    expect(segunda).toMatchObject({
      elementos: [{ id: 1, sentido: 'ENTRADA' }],
      haySiguiente: false,
    });
    expect(tercera).toEqual({ elementos: [], haySiguiente: false });
    const sinFiltro = await repositorio.consultar({
      sedeId: 1,
      pagina: 1,
      tamanioPagina: 10,
    });
    expect(sinFiltro.elementos).toHaveLength(6);
    expect(
      sinFiltro.elementos.find((evento) => evento.id === 7)?.placa,
    ).toBeNull();
  });

  it('combina los filtros de cobros y usa fechas operativas inclusivas', async () => {
    await origen.query(`
      INSERT INTO cobro (sede_id, placa, tipo_vehiculo, dia_operativo, franja, tarifa_aplicada, estado)
      VALUES
        (1, 'ABC123', 'CARRO', '2026-11-21', 'DIURNA', 5000, 'PENDIENTE'),
        (1, 'ABC123', 'CARRO', '2026-11-22', 'NOCTURNA', 3000, 'PENDIENTE'),
        (1, 'ABC123', 'CARRO', '2026-11-23', 'DIURNA', 5000, 'PENDIENTE'),
        (1, 'ABC123', 'CARRO', '2026-11-20', 'DIURNA', 5000, 'PENDIENTE'),
        (1, 'ABC123', 'CARRO', '2026-11-19', 'DIURNA', 5000, 'PAGADO'),
        (1, 'DEF456', 'CARRO', '2026-11-22', 'DIURNA', 5000, 'PAGADO'),
        (2, 'ABC123', 'CARRO', '2026-11-22', 'DIURNA', 5000, 'PENDIENTE')
    `);
    const repositorio = new ConsultaCobrosPostgresRepository(origen);
    const filtros = {
      sedeId: 1,
      placa,
      diaDesde: '2026-11-21',
      diaHasta: '2026-11-22',
      estado: 'PENDIENTE',
      tamanioPagina: 1,
    } as const;

    const primera = await repositorio.consultar({ ...filtros, pagina: 1 });
    const segunda = await repositorio.consultar({ ...filtros, pagina: 2 });
    const pagados = await repositorio.consultar({
      sedeId: 1,
      estado: 'PAGADO',
      pagina: 1,
      tamanioPagina: 10,
    });

    expect(primera).toMatchObject({
      elementos: [{ id: 2, diaOperativo: '2026-11-22', tarifaAplicada: 3000 }],
      haySiguiente: true,
    });
    expect(segunda).toMatchObject({
      elementos: [{ id: 1, diaOperativo: '2026-11-21' }],
      haySiguiente: false,
    });
    expect(pagados.elementos.map((cobro) => cobro.id)).toEqual([6, 5]);
  });
});

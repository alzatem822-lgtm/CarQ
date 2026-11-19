import type { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { RegistrarPagoEfectivo } from '../aplicacion/registrar-pago-efectivo';
import { GuardarPaseDePago } from '../aplicacion/guardar-pase-de-pago';
import { Cobro } from '../dominio/cobro';
import { CobroPostgresRepository } from './cobro-postgres.repository';
import { PagoPostgresRepository } from './pago-postgres.repository';
import { TransaccionPagoPostgres } from './transaccion-pago-postgres';

describe('Pago en efectivo con PostgreSQL', () => {
  let db: DataSource;
  let registrar: RegistrarPagoEfectivo;
  let cobros: CobroPostgresRepository;
  let pagos: PagoPostgresRepository;
  const guardarPase = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    cobros = new CobroPostgresRepository(db);
    pagos = new PagoPostgresRepository(db);
    const reloj = new RelojFijo(new Date('2026-11-19T15:00Z'));
    registrar = new RegistrarPagoEfectivo(
      new TransaccionPagoPostgres(db),
      reloj,
      pagos,
      new GuardarPaseDePago(
        { guardar: guardarPase, consultar: jest.fn() },
        new DiaOperativo(),
        reloj,
      ),
    );
  }, 30000);

  beforeEach(async () => {
    guardarPase.mockClear();
    await limpiarBaseDatosPruebas(db);
    await db.query("INSERT INTO sede (nombre) VALUES ('Sede de pruebas')");
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
  });
  afterAll(async () => {
    await db?.destroy();
  });

  async function pendiente(placa = 'ABC123') {
    const cobro = await cobros.guardar(
      Cobro.crear({
        placa: Placa.crear(placa),
        tipoVehiculo: TipoVehiculo.CARRO,
        sedeId: 1,
        diaOperativo: '2026-11-19',
        franja: 'DIURNA',
        tarifaAplicada: 5000,
      }),
    );
    if (cobro.id === null) throw new Error('Falta el id del cobro de prueba');
    return {
      cobroId: cobro.id,
      sedeId: 1,
      referencia: 'ref-prueba',
      operador: 'operador',
    };
  }

  it('registra operador y estado una sola vez ante el mismo envío simultáneo', async () => {
    const solicitud = await pendiente();
    const [a, b] = await Promise.all([
      registrar.ejecutar(solicitud),
      registrar.ejecutar(solicitud),
    ]);
    expect(a.cobro.estado).toBe('PAGADO');
    expect(b.pago.id).toBe(a.pago.id);
    expect(await pagos.buscarPorReferencia(solicitud.referencia)).toMatchObject(
      { operador: 'operador', monto: 5000 },
    );
    const filas: { total: number }[] = await db.query(
      'SELECT count(*)::int AS total FROM pago',
    );
    expect(filas[0].total).toBe(1);
    expect(guardarPase).toHaveBeenCalledWith(
      expect.objectContaining({
        cobroId: solicitud.cobroId,
        pagoId: a.pago.id,
        venceEn: new Date('2026-11-20T11:00:00.000Z'),
      }),
    );
  });

  it('revierte el estado si falla la escritura del pago', async () => {
    const solicitud = await pendiente();
    await expect(
      registrar.ejecutar({ ...solicitud, operador: 'inexistente' }),
    ).rejects.toBeDefined();
    await expect(
      cobros.buscarPorId(solicitud.cobroId, 1),
    ).resolves.toMatchObject({ estado: 'PENDIENTE' });
    await expect(
      pagos.buscarPorReferencia(solicitud.referencia),
    ).resolves.toBeNull();
    expect(guardarPase).not.toHaveBeenCalled();
  });

  it('rechaza una referencia utilizada para otro cobro', async () => {
    const primero = await pendiente();
    const otro = await pendiente('XYZ456');
    await registrar.ejecutar(primero);
    await expect(registrar.ejecutar(otro)).rejects.toMatchObject({
      codigo: 'REFERENCIA_EN_USO',
    });
    await expect(cobros.buscarPorId(otro.cobroId, 1)).resolves.toMatchObject({
      estado: 'PENDIENTE',
    });
  });
});

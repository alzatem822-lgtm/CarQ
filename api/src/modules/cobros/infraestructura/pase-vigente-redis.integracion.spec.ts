import type { Redis } from 'ioredis';
import type { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { iniciarRedisPruebas } from '../../../compartido/pruebas/redis-pruebas';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ConsultarPaseVigente } from '../aplicacion/consultar-pase-vigente';
import { GuardarPaseDePago } from '../aplicacion/guardar-pase-de-pago';
import { RegistrarPagoEfectivo } from '../aplicacion/registrar-pago-efectivo';
import { Cobro } from '../dominio/cobro';
import { CobroPostgresRepository } from './cobro-postgres.repository';
import { PagoPostgresRepository } from './pago-postgres.repository';
import { PaseVigenteRedisRepository } from './pase-vigente-redis.repository';
import { TransaccionPagoPostgres } from './transaccion-pago-postgres';

describe('Vencimiento del pase con Redis y PostgreSQL', () => {
  let redis: Redis;
  let db: DataSource;

  beforeAll(async () => {
    redis = await iniciarRedisPruebas();
    db = await iniciarBaseDatosPruebas();
    await limpiarBaseDatosPruebas(db);
    await db.query("INSERT INTO sede (nombre) VALUES ('Sede de pruebas')");
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
  }, 30000);

  afterAll(async () => {
    try {
      await db?.destroy();
    } finally {
      await redis?.quit();
    }
  });

  it('vence en el corte de las 06:00 de Bogotá tras confirmar el pago', async () => {
    const duracionDia = 24 * 60 * 60 * 1000;
    // Redis usa su reloj real. El corte futuro deja margen para mover RelojFijo sin esperar.
    const venceEn = new Date(Date.now() + duracionDia);
    venceEn.setUTCHours(11, 0, 0, 0);
    const diaOperativo = new Date(venceEn.getTime() - duracionDia)
      .toISOString()
      .slice(0, 10);
    const reloj = new RelojFijo(new Date(venceEn.getTime() - 1));
    const dias = new DiaOperativo('America/Bogota', '06:00');
    const placa = Placa.crear('ABC123');
    const sedeId = 1;
    const clave = { placa, sedeId, diaOperativo };
    const claveRedis = `carq:pase:${sedeId}:${placa.valor}:${diaOperativo}`;
    const cobros = new CobroPostgresRepository(db);
    const pagos = new PagoPostgresRepository(db);
    const pases = new PaseVigenteRedisRepository(redis, reloj);
    const consultar = new ConsultarPaseVigente(pases, cobros, dias, reloj);
    const registrar = new RegistrarPagoEfectivo(
      new TransaccionPagoPostgres(db),
      reloj,
      pagos,
      new GuardarPaseDePago(pases, dias, reloj),
    );

    const cobro = await cobros.guardar(
      Cobro.crear({
        ...clave,
        tipoVehiculo: TipoVehiculo.CARRO,
        franja: 'NOCTURNA',
        tarifaAplicada: 5000,
      }),
    );
    if (cobro.id === null) throw new Error('Falta el id del cobro de prueba');
    const cobroId = cobro.id;

    try {
      const resultado = await registrar.ejecutar({
        cobroId,
        sedeId,
        operador: 'operador',
        referencia: 'carq-214-vencimiento-pase',
      });
      expect(resultado.cobro.estado).toBe('PAGADO');
      await expect(redis.pexpiretime(claveRedis)).resolves.toBe(
        venceEn.getTime(),
      );
      const pase = { ...clave, cobroId, pagoId: resultado.pago.id, venceEn };
      await expect(pases.consultar(clave)).resolves.toEqual(pase);
      await expect(consultar.ejecutar(placa, sedeId)).resolves.toEqual(pase);

      reloj.fijar(venceEn);

      await expect(pases.consultar(clave)).resolves.toBeNull();
      await expect(consultar.ejecutar(placa, sedeId)).resolves.toBeNull();
      await expect(cobros.buscarPorId(cobroId, sedeId)).resolves.toMatchObject({
        estado: 'PAGADO',
      });
    } finally {
      await redis.del(claveRedis);
    }
  });
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../../app.module';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { validarEntorno } from '../../../compartido/configuracion/validar-entorno';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { sembrarSedeYCarril } from '../../../compartido/base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../../../compartido/base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../../../compartido/base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../../../compartido/base-datos/seeds/umbral.seed';
import { Reloj } from '../../../compartido/reloj/reloj';
import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { LectorPlaca } from '../../vehiculos/aplicacion/lector-placa';
import { BarreraCarril } from './barrera-carril';
import { EstadoCarrilStore } from './estado-carril.store';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { ConfirmarLecturaManual } from './confirmar-lectura-manual';

describe('Confirmación manual con PostgreSQL y Redis reales (CARQ-148)', () => {
  let db: DataSource;
  let app: INestApplication;
  let confirmar: ConfirmarLecturaManual;
  const barrera = {
    abrir: jest.fn(),
    denegar: jest.fn(),
    consultarEstado: jest.fn(),
  };
  const lectorCaptura = {
    leer: jest.fn().mockRejectedValue(new Error('OCR caído')),
  };
  const solicitud = {
    sedeId: 1,
    carrilId: 1,
    sentido: 'ENTRADA' as const,
    placa: 'ABC123',
    operador: 'operador',
  };
  const eventos = () =>
    db.query(
      'SELECT placa, sentido, resultado, lectura_manual, origen, operador, confianza FROM evento ORDER BY id',
    );

  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      FUENTE_SENSOR: 'simulado',
      CONTROLADOR_BARRERA: 'simulado',
      LECTOR_PLACAS: 'simulado',
      ZONA_HORARIA: 'America/Bogota',
      INICIO_DIA_OPERATIVO: '06:00',
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .overrideProvider(Reloj)
      .useValue(new RelojFijo(new Date('2026-11-23T15:00:00Z')))
      .overrideProvider(BarreraCarril)
      .useValue(barrera)
      .overrideProvider(LectorPlaca)
      .useValue(lectorCaptura)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
    confirmar = app.get(ConfirmarLecturaManual);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarCupos(db);
    await sembrarTarifasYFranja(db);
    await sembrarUmbral(db);
    await db.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador', 'hash-prueba', 'OPERADOR')",
    );
    await app.get(EstadoCarrilStore).guardar(estadoCarrilInicial());
    jest.clearAllMocks();
    barrera.abrir.mockResolvedValue(undefined);
    barrera.denegar.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });

  it('confirma placa normalizada con evento manual y operador, aun si falla el lector de capturas', async () => {
    await expect(
      confirmar.ejecutar({ ...solicitud, placa: ' abc-123 ' }),
    ).resolves.toMatchObject({ resultado: 'AUTORIZADO' });
    expect(await eventos()).toEqual([
      expect.objectContaining({
        placa: 'ABC123',
        sentido: 'ENTRADA',
        resultado: 'AUTORIZADO',
        origen: 'MANUAL',
        lectura_manual: true,
        operador: 'operador',
      }),
    ]);
    expect((await db.query('SELECT estado FROM cobro'))[0].estado).toBe(
      'PENDIENTE',
    );
    expect(lectorCaptura.leer).not.toHaveBeenCalled();
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });

  it('conserva cupo lleno y registra rechazo manual sin apertura ni estancia', async () => {
    await db.query("UPDATE cupo SET maximo = 0 WHERE tipo = 'CARRO'");
    await expect(confirmar.ejecutar(solicitud)).resolves.toMatchObject({
      resultado: 'RECHAZADO',
      motivo: 'LLENO',
    });
    expect(await db.query('SELECT id FROM estancia')).toHaveLength(0);
    expect(await db.query('SELECT id FROM cobro')).toHaveLength(0);
    expect(await eventos()).toEqual([
      expect.objectContaining({
        resultado: 'RECHAZADO',
        lectura_manual: true,
        operador: 'operador',
      }),
    ]);
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it('no omite deuda pendiente al confirmar salida y mantiene abierta la estancia', async () => {
    await confirmar.ejecutar(solicitud);
    barrera.abrir.mockClear();
    await expect(
      confirmar.ejecutar({ ...solicitud, sentido: 'SALIDA' }),
    ).resolves.toEqual({
      resultado: 'RECHAZADO',
      motivo: 'Cobro pendiente, pasar por caja',
    });
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).toBeNull();
    expect((await eventos())[1]).toMatchObject({
      sentido: 'SALIDA',
      resultado: 'RECHAZADO',
      origen: 'MANUAL',
      lectura_manual: true,
      operador: 'operador',
    });
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it('permite entrada y cierre de moto gratuita con ambos eventos manuales', async () => {
    await db.query("UPDATE tarifa SET valor = 0 WHERE tipo_vehiculo = 'MOTO'");
    await confirmar.ejecutar({ ...solicitud, placa: 'ABC12A' });
    await expect(
      confirmar.ejecutar({ ...solicitud, placa: 'ABC12A', sentido: 'SALIDA' }),
    ).resolves.toMatchObject({ resultado: 'AUTORIZADO' });
    expect(
      (await db.query('SELECT salida_en FROM estancia'))[0].salida_en,
    ).not.toBeNull();
    expect(await db.query('SELECT id FROM cobro')).toHaveLength(0);
    const filas = await eventos();
    expect(filas).toHaveLength(2);
    for (const fila of filas)
      expect(fila).toMatchObject({
        resultado: 'AUTORIZADO',
        origen: 'MANUAL',
        lectura_manual: true,
        operador: 'operador',
      });
    expect(barrera.abrir).toHaveBeenCalledTimes(2);
  });

  it('rechaza salida sin ingreso y conserva operador y origen manual del intento', async () => {
    await expect(
      confirmar.ejecutar({ ...solicitud, sentido: 'SALIDA' }),
    ).resolves.toEqual({
      resultado: 'RECHAZADO',
      motivo: 'Sin ingreso registrado',
    });
    expect(await eventos()).toEqual([
      expect.objectContaining({
        resultado: 'RECHAZADO',
        lectura_manual: true,
        operador: 'operador',
      }),
    ]);
    expect(barrera.abrir).not.toHaveBeenCalled();
  });

  it('no duplica el ingreso ya confirmado', async () => {
    await confirmar.ejecutar(solicitud);
    await expect(confirmar.ejecutar(solicitud)).resolves.toMatchObject({
      resultado: 'RECHAZADO',
      motivo: 'Ingreso ya registrado',
    });
    expect(await db.query('SELECT id FROM cobro')).toHaveLength(1);
    expect(await db.query('SELECT id FROM estancia')).toHaveLength(1);
    expect(barrera.abrir).toHaveBeenCalledTimes(1);
  });
});

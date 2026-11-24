import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ConfiguracionSistema } from '../src/compartido/configuracion/configuracion-sistema';
import { validarEntorno } from '../src/compartido/configuracion/validar-entorno';
import { configurarHttp } from '../src/compartido/configurar-http';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../src/compartido/pruebas/base-datos-pruebas';
import { sembrarSedeYCarril } from '../src/compartido/base-datos/seeds/sede-carril.seed';
import { sembrarCupos } from '../src/compartido/base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../src/compartido/base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../src/compartido/base-datos/seeds/umbral.seed';
import { sembrarUsuarios } from '../src/compartido/base-datos/seeds/usuarios.seed';
import { Reloj } from '../src/compartido/reloj/reloj';
import { RelojFijo } from '../src/compartido/reloj/reloj-fijo';

async function main() {
  const origen = new URL(process.env.URL_BASE_DATOS_PRUEBAS ?? '');
  if (
    !origen.pathname.endsWith('_pruebas') ||
    !['localhost', '127.0.0.1'].includes(origen.hostname)
  )
    throw new Error('E2E requiere PostgreSQL local de pruebas');
  const e2e = new URL(origen);
  e2e.pathname = '/carq_e2e_pruebas';
  const redis = new URL(process.env.URL_REDIS_PRUEBAS ?? '');
  if (
    !['localhost', '127.0.0.1'].includes(redis.hostname) ||
    redis.port !== '6380'
  )
    throw new Error('E2E requiere Redis local de pruebas en 6380');
  // Base lógica reservada para E2E; no se vacía ninguna base de Redis.
  redis.pathname = '/15';
  const cliente = new DataSource({ type: 'postgres', url: origen.toString() });
  await cliente.initialize();
  try {
    const existe = await cliente.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      ['carq_e2e_pruebas'],
    );
    if (!existe.length) await cliente.query('CREATE DATABASE carq_e2e_pruebas');
  } finally {
    await cliente.destroy();
  }

  process.env.URL_BASE_DATOS_PRUEBAS = e2e.toString();
  const db = await iniciarBaseDatosPruebas();
  try {
    if (
      new URL(db.options.type === 'postgres' ? db.options.url! : '')
        .pathname !== '/carq_e2e_pruebas'
    )
      throw new Error(
        'Se rechaza limpiar una base distinta de carq_e2e_pruebas',
      );
    await limpiarBaseDatosPruebas(db);
    for (const sembrar of [
      sembrarSedeYCarril,
      sembrarCupos,
      sembrarUsuarios,
      sembrarTarifasYFranja,
      sembrarUmbral,
    ])
      await sembrar(db);
  } finally {
    await db.destroy();
  }

  const entorno = validarEntorno({
    ...process.env,
    NODE_ENV: 'test',
    PUERTO: '3101',
    URL_BASE_DATOS: e2e.toString(),
    URL_REDIS: redis.toString(),
    URL_WEB: 'http://127.0.0.1:3102',
    LECTOR_PLACAS: 'simulado',
    FUENTE_SENSOR: 'simulado',
    CONTROLADOR_BARRERA: 'simulado',
    ZONA_HORARIA: 'America/Bogota',
    INICIO_DIA_OPERATIVO: '06:00',
    JWT_SECRETO: 'carq-e2e-solo-pruebas-locales',
  });
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfiguracionSistema)
    .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
    .overrideProvider(Reloj)
    .useValue(new RelojFijo(new Date('2026-11-23T15:00:00Z')))
    .compile();
  const app = modulo.createNestApplication();
  configurarHttp(app, entorno.URL_WEB);
  app.enableShutdownHooks();
  await app.listen(3101, '127.0.0.1');
}

main().catch(() => {
  console.error('No se pudo iniciar el entorno E2E aislado');
  process.exit(1);
});

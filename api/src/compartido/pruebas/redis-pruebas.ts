import { Redis } from 'ioredis';
import { crearClienteRedis } from '../redis/crear-cliente-redis';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

/**
 * Abre la conexión al Redis de pruebas.
 * Se niega a conectar si apunta al Redis de desarrollo, porque la limpieza
 * borra todas las claves.
 */
export async function iniciarRedisPruebas(): Promise<Redis> {
  const url = process.env.URL_REDIS_PRUEBAS;
  if (!url) {
    throw new Error('Falta URL_REDIS_PRUEBAS en el entorno de pruebas');
  }
  if (url === process.env.URL_REDIS) {
    throw new Error(
      'URL_REDIS_PRUEBAS no puede ser igual a URL_REDIS: la limpieza borraría los datos de desarrollo',
    );
  }
  const cliente = crearClienteRedis(url, () => undefined);
  await cliente.connect();
  return cliente;
}

/** Borra todas las claves del Redis de pruebas. */
export async function limpiarRedisPruebas(cliente: Redis): Promise<void> {
  await cliente.flushdb();
}
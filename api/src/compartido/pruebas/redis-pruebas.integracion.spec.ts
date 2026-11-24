import { Redis } from 'ioredis';
import {
  iniciarRedisPruebas,
  limpiarRedisPruebas,
} from './redis-pruebas';

describe('Redis de pruebas (integración)', () => {
  let redis: Redis;

  beforeAll(async () => {
    redis = await iniciarRedisPruebas();
  });

  beforeEach(async () => {
    await limpiarRedisPruebas(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it('guarda y lee una clave con expiración en Redis real', async () => {
    await redis.set('pase:prueba', 'vigente', 'EX', 60);

    expect(await redis.get('pase:prueba')).toBe('vigente');
    expect(await redis.ttl('pase:prueba')).toBeGreaterThan(0);
  });

  it('cada prueba parte de un Redis vacío', async () => {
    expect(await redis.dbsize()).toBe(0);
  });

  it('la limpieza borra las claves guardadas', async () => {
    await redis.set('pase:otra', 'vigente');

    await limpiarRedisPruebas(redis);

    expect(await redis.get('pase:otra')).toBeNull();
  });
});
import { Redis } from 'ioredis';

export function crearClienteRedis(
  url: string,
  alFallar: (error: Error) => void,
): Redis {
  const cliente = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (intentos) => Math.min(intentos * 200, 2000),
  });
  cliente.on('error', alFallar);
  return cliente;
}
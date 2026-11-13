import { crearClienteRedis } from './crear-cliente-redis';

describe('crearClienteRedis', () => {
  it('no se conecta hasta que se pide', () => {
    const cliente = crearClienteRedis('redis://127.0.0.1:1', () => undefined);

    expect(cliente.status).toBe('wait');
    cliente.disconnect();
  });

  it('no lanza si Redis no está disponible y reporta el error', async () => {
    const errores: Error[] = [];
    const cliente = crearClienteRedis('redis://127.0.0.1:1', (error) =>
      errores.push(error),
    );

    const primerError = new Promise<void>((resolver) =>
      cliente.once('error', () => resolver()),
    );
    cliente.connect().catch(() => undefined);
    await primerError;
    cliente.disconnect();

    expect(errores.length).toBeGreaterThan(0);
  });
});
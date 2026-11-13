import { HasheadorBcrypt } from './hasheador-bcrypt';

describe('HasheadorBcrypt', () => {
  const hasheador = new HasheadorBcrypt();

  it('nunca devuelve la contraseña en claro', async () => {
    const hash = await hasheador.hash('secreta123');
    expect(hash).not.toBe('secreta123');
    expect(hash).not.toContain('secreta123');
  });

  it('compara correctamente una contraseña válida', async () => {
    const hash = await hasheador.hash('secreta123');
    expect(await hasheador.comparar('secreta123', hash)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hasheador.hash('secreta123');
    expect(await hasheador.comparar('otra', hash)).toBe(false);
  });

  it('genera hashes distintos para la misma contraseña (sal)', async () => {
    const primero = await hasheador.hash('secreta123');
    const segundo = await hasheador.hash('secreta123');
    expect(primero).not.toBe(segundo);
  });
});
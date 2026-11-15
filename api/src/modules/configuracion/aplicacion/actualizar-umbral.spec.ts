import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ActualizarUmbral } from './actualizar-umbral';
import { ParametroRepositoryEnMemoria } from './parametro.repository.en-memoria';

describe('ActualizarUmbral', () => {
  it('guarda un umbral válido', async () => {
    const repo = new ParametroRepositoryEnMemoria(UmbralConfianza.crear(0.85));

    await new ActualizarUmbral(repo).ejecutar(0.7);

    expect((await repo.obtenerUmbral()).valor).toBe(0.7);
  });

  it('rechaza un valor inválido y no modifica el umbral', async () => {
    const original = UmbralConfianza.crear(0.85);
    const repo = new ParametroRepositoryEnMemoria(original);

    await expect(new ActualizarUmbral(repo).ejecutar(1.5)).rejects.toThrow(
      ErrorDominio,
    );

    expect(await repo.obtenerUmbral()).toBe(original);
  });
});
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Franja } from '../dominio/franja';
import { ActualizarFranja } from './actualizar-franja';
import { FranjaRepository } from './franja.repository';

class FranjaEnMemoria extends FranjaRepository {
  guardados = 0;

  constructor(public franja: Franja) {
    super();
  }

  async obtener(): Promise<Franja> {
    return this.franja;
  }

  async guardar(franja: Franja): Promise<void> {
    this.franja = franja;
    this.guardados++;
  }
}

describe('ActualizarFranja', () => {
  it('guarda una franja válida', async () => {
    const repo = new FranjaEnMemoria(Franja.diurna(6, 18));

    await new ActualizarFranja(repo).ejecutar(7, 19);

    expect(repo.franja.inicioHora).toBe(7);
    expect(repo.franja.finHora).toBe(19);
    expect(repo.guardados).toBe(1);
  });

  it.each([
    [18, 6],
    [6, 6],
    [-1, 18],
    [6, 25],
  ])('rechaza la franja %i a %i y no guarda nada', async (inicio, fin) => {
    const repo = new FranjaEnMemoria(Franja.diurna(6, 18));

    const error = await new ActualizarFranja(repo)
      .ejecutar(inicio, fin)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDominio);
    expect((error as ErrorDominio).codigo).toBe('FRANJA_INVALIDA');
    expect(repo.guardados).toBe(0);
  });
});
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoRepository } from './cupo.repository';
import { ConsultarCupos } from './consultar-cupos';

class CupoRepositoryEnMemoria extends CupoRepository {
  constructor(private cupos: Cupo[] = []) {
    super();
  }

  obtenerTodos(): Promise<Cupo[]> {
    return Promise.resolve([...this.cupos]);
  }

  guardarTodos(cupos: Cupo[]): Promise<void> {
    this.cupos = [...cupos];
    return Promise.resolve();
  }
}

describe('ConsultarCupos', () => {
  it('devuelve los cupos guardados', async () => {
    const carro = Cupo.crear('s1', TipoVehiculo.CARRO, 50);
    const moto = Cupo.crear('s1', TipoVehiculo.MOTO, 20);
    const consultar = new ConsultarCupos(
      new CupoRepositoryEnMemoria([carro, moto]),
    );

    const resultado = await consultar.ejecutar();

    expect(resultado).toEqual([carro, moto]);
  });

  it('devuelve una lista vacía si no hay cupos', async () => {
    const consultar = new ConsultarCupos(new CupoRepositoryEnMemoria());

    expect(await consultar.ejecutar()).toEqual([]);
  });
});
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cupo } from '../dominio/cupo';
import { CupoRepository } from './cupo.repository';
import { ActualizarCupo } from './actualizar-cupo';

class CupoRepositoryEnMemoria extends CupoRepository {
  constructor(public cupos: Cupo[] = []) {
    super();
  }

  obtenerTodos(): Promise<Cupo[]> {
    return Promise.resolve([...this.cupos]);
  }

  guardarTodos(cupos: Cupo[]): Promise<void> {
    this.cupos = [...this.cupos.filter(c => !cupos.some(n => n.sedeId === c.sedeId && n.tipoVehiculo.equals(c.tipoVehiculo))), ...cupos];
    return Promise.resolve();
  }
}

describe('ActualizarCupo', () => {
  it('valida todo el lote antes de guardar y no deja el primero ante un segundo inválido', async () => {
    const repo = new CupoRepositoryEnMemoria([Cupo.crear('s1', TipoVehiculo.CARRO, 3)]);
    const guardar = jest.spyOn(repo, 'guardarTodos');
    await expect(new ActualizarCupo(repo, 's1').ejecutarVarios([{ tipo: TipoVehiculo.CARRO, maximo: 10 }, { tipo: TipoVehiculo.MOTO, maximo: -1 }])).rejects.toThrow();
    expect(guardar).not.toHaveBeenCalled();
    expect(repo.cupos[0].maximo).toBe(3);
  });

  it('envía todos los tipos en una sola operación y propaga un fallo de persistencia', async () => {
    const repo = new CupoRepositoryEnMemoria();
    const guardar = jest.spyOn(repo, 'guardarTodos').mockRejectedValue(new Error('fallo de persistencia'));
    await expect(new ActualizarCupo(repo, 's1').ejecutarVarios([{ tipo: TipoVehiculo.CARRO, maximo: 10 }, { tipo: TipoVehiculo.MOTO, maximo: 5 }])).rejects.toThrow('fallo de persistencia');
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(guardar.mock.calls[0][0]).toHaveLength(2);
  });
  it('guarda un máximo válido', async () => {
    const repo = new CupoRepositoryEnMemoria([
      Cupo.crear('s1', TipoVehiculo.CARRO, 50),
    ]);

    await new ActualizarCupo(repo, 's1').ejecutar(TipoVehiculo.CARRO, 30);

    expect(repo.cupos).toHaveLength(1);
    expect(repo.cupos[0].maximo).toBe(30);
  });

  it('crea el cupo si el tipo no existía', async () => {
    const repo = new CupoRepositoryEnMemoria();

    await new ActualizarCupo(repo, 's1').ejecutar(TipoVehiculo.MOTO, 10);

    expect(repo.cupos).toHaveLength(1);
    expect(repo.cupos[0].tipoVehiculo).toBe(TipoVehiculo.MOTO);
    expect(repo.cupos[0].maximo).toBe(10);
  });

  it('no modifica los cupos de otros tipos', async () => {
    const moto = Cupo.crear('s1', TipoVehiculo.MOTO, 20);
    const repo = new CupoRepositoryEnMemoria([
      Cupo.crear('s1', TipoVehiculo.CARRO, 50),
      moto,
    ]);

    await new ActualizarCupo(repo, 's1').ejecutar(TipoVehiculo.CARRO, 5);

    expect(repo.cupos).toContainEqual(moto);
  });

  it('rechaza un máximo negativo y no guarda nada', async () => {
    const original = Cupo.crear('s1', TipoVehiculo.CARRO, 50);
    const repo = new CupoRepositoryEnMemoria([original]);

    await expect(
      new ActualizarCupo(repo, 's1').ejecutar(TipoVehiculo.CARRO, -1),
    ).rejects.toThrow('no negativo');

    expect(repo.cupos).toEqual([original]);
  });

  it('resuelve la sede con una función cuando no se le da el id directo', async () => {
    const repo = new CupoRepositoryEnMemoria();
    const resolverSede = jest.fn(() => Promise.resolve('s7'));

    await new ActualizarCupo(repo, resolverSede).ejecutar(TipoVehiculo.MOTO, 8);

    expect(resolverSede).toHaveBeenCalledTimes(1);
    expect(repo.cupos[0].sedeId).toBe('s7');
  });
});

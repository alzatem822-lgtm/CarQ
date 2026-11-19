import { CupoRepository } from '../../configuracion/aplicacion/cupo.repository';
import { Cupo } from '../../configuracion/dominio/cupo';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ConsultarOcupacion } from './consultar-ocupacion';
import { EstanciaRepository } from './estancia.repository';

describe('ConsultarOcupacion', () => {
  let cupos: jest.Mocked<CupoRepository>;
  let estancias: jest.Mocked<EstanciaRepository>;
  let consultar: ConsultarOcupacion;

  beforeEach(() => {
    cupos = { obtenerTodos: jest.fn(), guardarTodos: jest.fn() };
    estancias = {
      abrir: jest.fn(),
      cerrar: jest.fn(),
      buscarAbiertaPorPlaca: jest.fn(),
      contarAbiertasPorTipo: jest.fn(),
    };
    consultar = new ConsultarOcupacion(cupos, estancias);
  });

  it('devuelve ocupación y máximo de CARRO y MOTO en la sede solicitada', async () => {
    cupos.obtenerTodos.mockResolvedValue([
      Cupo.crear('7', TipoVehiculo.CARRO, 3),
      Cupo.crear('7', TipoVehiculo.MOTO, 5),
      Cupo.crear('8', TipoVehiculo.CARRO, 20),
    ]);
    estancias.contarAbiertasPorTipo.mockImplementation((_sede, tipo) =>
      Promise.resolve(tipo.equals(TipoVehiculo.CARRO) ? 2 : 1),
    );

    expect(await consultar.ejecutar(7)).toEqual([
      { tipoVehiculo: 'CARRO', ocupacion: 2, maximo: 3 },
      { tipoVehiculo: 'MOTO', ocupacion: 1, maximo: 5 },
    ]);
    expect(estancias.contarAbiertasPorTipo).toHaveBeenCalledTimes(2);
    expect(estancias.contarAbiertasPorTipo).toHaveBeenCalledWith(
      7,
      TipoVehiculo.CARRO,
    );
    expect(estancias.contarAbiertasPorTipo).toHaveBeenCalledWith(
      7,
      TipoVehiculo.MOTO,
    );
  });

  it.each([0, 3, 4])(
    'informa la ocupación real %s sin limitarla al máximo',
    async (ocupacion) => {
      cupos.obtenerTodos.mockResolvedValue([
        Cupo.crear('1', TipoVehiculo.CARRO, 3),
      ]);
      estancias.contarAbiertasPorTipo.mockResolvedValue(ocupacion);

      expect(await consultar.ejecutar(1)).toEqual([
        { tipoVehiculo: 'CARRO', ocupacion, maximo: 3 },
      ]);
    },
  );

  it('conserva una capacidad configurada en cero', async () => {
    cupos.obtenerTodos.mockResolvedValue([
      Cupo.crear('1', TipoVehiculo.MOTO, 0),
    ]);
    estancias.contarAbiertasPorTipo.mockResolvedValue(0);

    expect(await consultar.ejecutar(1)).toEqual([
      { tipoVehiculo: 'MOTO', ocupacion: 0, maximo: 0 },
    ]);
  });

  it('no inventa cupos cuando la sede no tiene configuración', async () => {
    cupos.obtenerTodos.mockResolvedValue([
      Cupo.crear('2', TipoVehiculo.CARRO, 3),
    ]);

    expect(await consultar.ejecutar(1)).toEqual([]);
    expect(estancias.contarAbiertasPorTipo).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN])(
    'rechaza un identificador de sede inválido: %s',
    async (sedeId) => {
      await expect(consultar.ejecutar(sedeId)).rejects.toThrow(
        'La sede debe tener un identificador entero positivo',
      );
      expect(cupos.obtenerTodos).not.toHaveBeenCalled();
    },
  );

  it('propaga un fallo al consultar cupos sin presentar resultados ficticios', async () => {
    const error = new Error('Fallo de persistencia');
    cupos.obtenerTodos.mockRejectedValue(error);

    await expect(consultar.ejecutar(1)).rejects.toBe(error);
    expect(estancias.contarAbiertasPorTipo).not.toHaveBeenCalled();
  });

  it('propaga un fallo al contar estancias sin devolver una ocupación cero', async () => {
    const error = new Error('Fallo de persistencia');
    cupos.obtenerTodos.mockResolvedValue([
      Cupo.crear('1', TipoVehiculo.CARRO, 3),
    ]);
    estancias.contarAbiertasPorTipo.mockRejectedValue(error);

    await expect(consultar.ejecutar(1)).rejects.toBe(error);
  });
});

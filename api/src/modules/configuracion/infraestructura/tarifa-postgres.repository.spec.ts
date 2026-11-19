import { DataSource } from 'typeorm';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Tarifa } from '../dominio/tarifa';
import { TarifaPostgresRepository } from './tarifa-postgres.repository';

interface Consulta {
  sql: string;
  parametros: unknown[];
}

function origenFalso(opciones: {
  filas?: unknown[];
  errorAlGuardar?: unknown;
}) {
  const consultas: Consulta[] = [];
  const gestor = {
    query: (sql: string, parametros: unknown[]) => {
      consultas.push({ sql, parametros });
      return Promise.resolve([]);
    },
  };
  const origen = {
    query: () => Promise.resolve(opciones.filas ?? []),
    transaction: async (trabajo: (g: typeof gestor) => Promise<void>) => {
      await trabajo(gestor);
      if (opciones.errorAlGuardar) throw opciones.errorAlGuardar;
    },
  };
  return { origen: origen as unknown as DataSource, consultas };
}

const tarifas = [
  Tarifa.crear('2', TipoVehiculo.CARRO, 'DIURNA', 5000),
  Tarifa.crear('2', TipoVehiculo.CARRO, 'NOCTURNA', 3000),
];

describe('TarifaPostgresRepository', () => {
  it('lee las tarifas y las convierte a entidades', async () => {
    const { origen } = origenFalso({
      filas: [
        { sede_id: 2, tipo_vehiculo: 'CARRO', franja: 'DIURNA', valor: 5000 },
      ],
    });
    const resultado = await new TarifaPostgresRepository(origen).obtenerTodas();
    expect(resultado).toHaveLength(1);
    expect(resultado[0].sedeId).toBe('2');
    expect(resultado[0].tipoVehiculo).toBe(TipoVehiculo.CARRO);
    expect(resultado[0].franja).toBe('DIURNA');
    expect(resultado[0].valor).toBe(5000);
  });

  it('guarda cada tarifa con SQL en la misma transacción', async () => {
    const { origen, consultas } = origenFalso({});
    await new TarifaPostgresRepository(origen).guardarTodas(tarifas);
    expect(consultas).toHaveLength(3);
    expect(consultas[0].sql).toContain('FOR NO KEY UPDATE');
    expect(consultas[0].parametros).toEqual([[2]]);
    expect(consultas[1].parametros).toEqual([2, 'CARRO', 'DIURNA', 5000]);
    expect(consultas[2].parametros).toEqual([2, 'CARRO', 'NOCTURNA', 3000]);
  });

  it('traduce la violación de unicidad a un error de dominio', async () => {
    const error = Object.assign(new Error('duplicado'), { code: '23505' });
    const { origen } = origenFalso({ errorAlGuardar: error });
    await expect(
      new TarifaPostgresRepository(origen).guardarTodas(tarifas),
    ).rejects.toMatchObject({ codigo: 'TARIFA_DUPLICADA' });
  });

  it('traduce la violación de RN-02 a un error de dominio', async () => {
    const error = Object.assign(new Error('check'), {
      driverError: { code: '23514' },
    });
    const { origen } = origenFalso({ errorAlGuardar: error });
    await expect(
      new TarifaPostgresRepository(origen).guardarTodas(tarifas),
    ).rejects.toMatchObject({ codigo: 'TARIFA_INVALIDA' });
  });

  it('relanza los errores que no conoce', async () => {
    const { origen } = origenFalso({ errorAlGuardar: new Error('caída') });
    await expect(
      new TarifaPostgresRepository(origen).guardarTodas(tarifas),
    ).rejects.toThrow('caída');
  });
});

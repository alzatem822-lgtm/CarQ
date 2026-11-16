import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { TipoFranja } from '../dominio/franja';
import { Tarifa } from '../dominio/tarifa';
import { ActualizarTarifas } from './actualizar-tarifas';
import { TarifaRepository } from './tarifa.repository';

class TarifasEnMemoria extends TarifaRepository {
  guardados = 0;

  constructor(public tarifas: Tarifa[]) {
    super();
  }

  async obtenerTodas(): Promise<Tarifa[]> {
    return this.tarifas;
  }

  async guardarTodas(tarifas: Tarifa[]): Promise<void> {
    this.tarifas = tarifas;
    this.guardados++;
  }
}

const tarifa = (franja: TipoFranja, valor: number) =>
  Tarifa.crear('sede-1', TipoVehiculo.CARRO, franja, valor);

const inicial = () => [tarifa('DIURNA', 5000), tarifa('NOCTURNA', 3000)];

describe('ActualizarTarifas', () => {
  it('guarda una actualización válida', async () => {
    const repo = new TarifasEnMemoria(inicial());

    await new ActualizarTarifas(repo).ejecutar([tarifa('NOCTURNA', 4000)]);

    const nocturna = repo.tarifas.find((t) => t.franja === 'NOCTURNA');
    expect(nocturna?.valor).toBe(4000);
    expect(repo.tarifas).toHaveLength(2);
  });

  it('rechaza una nocturna mayor o igual a la diurna y no guarda nada', async () => {
    const repo = new TarifasEnMemoria(inicial());

    const error = await new ActualizarTarifas(repo)
      .ejecutar([tarifa('NOCTURNA', 5000)])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDominio);
    expect((error as ErrorDominio).codigo).toBe('TARIFA_INVALIDA');
    expect((error as ErrorDominio).motivo).toContain('nocturna');
    expect(repo.guardados).toBe(0);
  });

  it('valida la diurna nueva contra la nocturna ya guardada', async () => {
    const repo = new TarifasEnMemoria(inicial());

    const error = await new ActualizarTarifas(repo)
      .ejecutar([tarifa('DIURNA', 2000)])
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDominio);
    expect(repo.guardados).toBe(0);
  });
});
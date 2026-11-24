import { Franja } from '../dominio/franja';
import { Tarifa } from '../dominio/tarifa';
import { FranjaRepository } from './franja.repository';
import { TarifaRepository } from './tarifa.repository';

export interface ConfiguracionTarifas {
  readonly tarifas: Tarifa[];
  readonly franja: Franja;
}

export class ConsultarConfiguracionTarifas {
  constructor(
    private readonly tarifas: TarifaRepository,
    private readonly franja: FranjaRepository,
  ) {}

  async ejecutar(sedeId?: string): Promise<ConfiguracionTarifas> {
    const [tarifas, franja] = await Promise.all([
      this.tarifas.obtenerTodas(sedeId),
      this.franja.obtener(),
    ]);
    return { tarifas, franja };
  }
}

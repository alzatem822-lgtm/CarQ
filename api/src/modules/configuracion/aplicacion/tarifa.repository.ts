import { Tarifa } from '../dominio/tarifa';

export abstract class TarifaRepository {
  abstract obtenerTodas(sedeId?: string): Promise<Tarifa[]>;
  abstract guardarTodas(tarifas: Tarifa[]): Promise<void>;
}

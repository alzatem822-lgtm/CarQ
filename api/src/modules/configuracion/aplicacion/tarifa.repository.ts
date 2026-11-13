import { Tarifa } from '../dominio/tarifa';

export abstract class TarifaRepository {
  abstract obtenerTodas(): Promise<Tarifa[]>;
  abstract guardarTodas(tarifas: Tarifa[]): Promise<void>;
}
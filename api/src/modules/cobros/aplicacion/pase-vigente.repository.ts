import { Placa } from '../../vehiculos/dominio/placa';

export interface ClavePase {
  placa: Placa;
  sedeId: number;
  diaOperativo: string;
}

export interface PaseVigente extends ClavePase {
  cobroId: number;
  pagoId?: number;
  venceEn: Date;
}

export abstract class PaseVigenteRepository {
  abstract guardar(pase: PaseVigente): Promise<void>;
  abstract consultar(clave: ClavePase): Promise<PaseVigente | null>;
}

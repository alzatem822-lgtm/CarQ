import { Placa } from '../../vehiculos/dominio/placa';
import { Cobro } from '../dominio/cobro';
import { CodigoEstadoCobro } from '../dominio/estado-cobro';

export abstract class CobroRepository {
  abstract buscarPorPlacaYDia(
    placa: Placa,
    sedeId: number,
    diaOperativo: string,
  ): Promise<Cobro | null>;
  abstract listarPendientes(
    placa: Placa,
    sedeId: number,
    hastaDia: string,
  ): Promise<Cobro[]>;
  abstract buscarPorId(id: number, sedeId: number): Promise<Cobro | null>;
  abstract guardar(cobro: Cobro): Promise<Cobro>;
  abstract actualizarEstado(
    cobro: Cobro,
    esperado: CodigoEstadoCobro,
  ): Promise<Cobro | null>;
}

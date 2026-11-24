import { Reloj } from '../../../compartido/reloj/reloj';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Placa } from '../../vehiculos/dominio/placa';
import { Cobro } from '../dominio/cobro';
import { CobroRepository } from './cobro.repository';

export class BuscarCobroPendientePorPlaca {
  constructor(
    private readonly cobros: CobroRepository,
    private readonly dias: DiaOperativo,
    private readonly reloj: Reloj,
  ) {}

  ejecutar(placa: Placa, sedeId: number): Promise<Cobro[]> {
    return this.cobros.listarPendientes(
      placa,
      sedeId,
      this.dias.de(this.reloj.ahora()),
    );
  }
}

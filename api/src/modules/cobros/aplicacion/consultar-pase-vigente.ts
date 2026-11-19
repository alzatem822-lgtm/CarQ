import { Reloj } from '../../../compartido/reloj/reloj';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Placa } from '../../vehiculos/dominio/placa';
import { CobroRepository } from './cobro.repository';
import { PaseVigente, PaseVigenteRepository } from './pase-vigente.repository';

export class ConsultarPaseVigente {
  constructor(
    private readonly pases: PaseVigenteRepository,
    private readonly cobros: CobroRepository,
    private readonly dias: DiaOperativo,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(placa: Placa, sedeId: number): Promise<PaseVigente | null> {
    const ahora = this.reloj.ahora();
    const diaOperativo = this.dias.de(ahora);
    const venceEn = this.dias.fin(diaOperativo);
    const clave = { placa, sedeId, diaOperativo };
    const cache = await this.pases.consultar(clave).catch(() => null);
    if (
      cache &&
      cache.placa.valor === placa.valor &&
      cache.sedeId === sedeId &&
      cache.diaOperativo === diaOperativo &&
      cache.venceEn.getTime() === venceEn.getTime() &&
      cache.venceEn > ahora
    )
      return cache;

    const cobro = await this.cobros.buscarPorPlacaYDia(
      placa,
      sedeId,
      diaOperativo,
    );
    if (!cobro || cobro.id === null || cobro.estado !== 'PAGADO') return null;
    return { ...clave, cobroId: cobro.id, venceEn };
  }
}

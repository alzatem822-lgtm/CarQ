import { Reloj } from '../../../compartido/reloj/reloj';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Cobro } from '../dominio/cobro';
import { Pago } from '../dominio/pago';
import { PaseVigenteRepository } from './pase-vigente.repository';

export class GuardarPaseDePago {
  constructor(
    private readonly pases: PaseVigenteRepository,
    private readonly dias: DiaOperativo,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(cobro: Cobro, pago: Pago): Promise<void> {
    const venceEn = this.dias.fin(cobro.diaOperativo);
    if (cobro.id === null || pago.id === null || venceEn <= this.reloj.ahora())
      return;
    await this.pases
      .guardar({
        placa: cobro.placa,
        sedeId: cobro.sedeId,
        diaOperativo: cobro.diaOperativo,
        cobroId: cobro.id,
        pagoId: pago.id,
        venceEn,
      })
      .catch(() => {
        // El cobro pagado en PostgreSQL permite recuperar la vigencia sin Redis.
      });
  }
}

import type { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import type { CobroRepository } from '../../cobros/aplicacion/cobro.repository';
import type { GenerarCobro } from '../../cobros/aplicacion/generar-cobro';
import {
  decidirSalida,
  type ResultadoDecisionSalida,
} from '../dominio/decision-salida';
import type { Estancia } from '../dominio/estancia';

type EstanciaParaCobro = Pick<
  Estancia,
  'placa' | 'sedeId' | 'tipoVehiculo' | 'ingresoEn'
>;

/** Evalúa los cobros de una estancia cuya apertura ya validó el flujo de salida. */
export class EvaluarCobroSalida {
  constructor(
    private readonly dias: DiaOperativo,
    private readonly cobros: Pick<
      CobroRepository,
      'listarPendientes' | 'buscarPorPlacaYDia'
    >,
    private readonly generar: Pick<GenerarCobro, 'ejecutar'>,
  ) {}

  async ejecutar(
    { placa, sedeId, tipoVehiculo, ingresoEn }: EstanciaParaCobro,
    ocurridoEn: Date,
  ): Promise<ResultadoDecisionSalida> {
    const diaSalida = this.dias.de(ocurridoEn);

    if (diaSalida > this.dias.de(ingresoEn)) {
      await this.generar.ejecutar({
        placa,
        sedeId,
        tipoVehiculo,
        ingresoEn: ocurridoEn,
      });
    }

    const pendientes = await this.cobros.listarPendientes(
      placa,
      sedeId,
      diaSalida,
    );
    if (pendientes.length > 0) return decidirSalida('PENDIENTE');

    const cobroActual = await this.cobros.buscarPorPlacaYDia(
      placa,
      sedeId,
      diaSalida,
    );
    return decidirSalida(cobroActual?.estado ?? null);
  }
}

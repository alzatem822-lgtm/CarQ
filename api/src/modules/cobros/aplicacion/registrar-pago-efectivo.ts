import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Reloj } from '../../../compartido/reloj/reloj';
import { Cobro } from '../dominio/cobro';
import { normalizarReferenciaPago, Pago } from '../dominio/pago';
import { PagoRepository } from './pago.repository';
import { TransaccionPago } from './transaccion-pago';

export interface SolicitudPago {
  cobroId: number;
  sedeId: number;
  referencia: string;
  operador: string;
}

export interface ResultadoPago {
  cobro: Cobro;
  pago: Pago;
}

export class RegistrarPagoEfectivo {
  constructor(
    private readonly transaccion: TransaccionPago,
    private readonly reloj: Reloj,
    private readonly pagos: PagoRepository,
  ) {}

  async ejecutar(solicitud: SolicitudPago): Promise<ResultadoPago> {
    const referencia = normalizarReferenciaPago(solicitud.referencia);
    try {
      return await this.registrar(solicitud, referencia);
    } catch (error) {
      if (!(error instanceof ErrorDominio) || error.codigo !== 'PAGO_DUPLICADO')
        throw error;
      const previo = await this.pagos.buscarPorReferencia(referencia);
      if (previo && previo.cobroId !== solicitud.cobroId)
        throw referenciaEnUso();
      throw error;
    }
  }

  private registrar(
    solicitud: SolicitudPago,
    referencia: string,
  ): Promise<ResultadoPago> {
    return this.transaccion.ejecutar(
      solicitud.cobroId,
      solicitud.sedeId,
      async ({ cobro, cobros, pagos }) => {
        if (!cobro)
          throw new ErrorDominio(
            'COBRO_NO_ENCONTRADO',
            'El cobro no existe en esta sede.',
          );

        const previo = await pagos.buscarPorReferencia(referencia);
        if (previo) {
          if (previo.cobroId !== solicitud.cobroId) throw referenciaEnUso();
          return { cobro, pago: previo };
        }

        const pagado = cobro.transicionar('PAGADO');
        const pago = Pago.crear({
          cobroId: solicitud.cobroId,
          referencia,
          monto: cobro.tarifaAplicada,
          operador: solicitud.operador,
          fecha: this.reloj.ahora(),
        });
        const confirmado = await cobros.actualizarEstado(pagado, 'PENDIENTE');
        if (!confirmado)
          throw new ErrorDominio(
            'ESTADO_COBRO_INVALIDO',
            'El cobro ya no está pendiente.',
          );

        return { cobro: confirmado, pago: await pagos.guardar(pago) };
      },
    );
  }
}

function referenciaEnUso(): ErrorDominio {
  return new ErrorDominio(
    'REFERENCIA_EN_USO',
    'La referencia corresponde a otro cobro.',
  );
}

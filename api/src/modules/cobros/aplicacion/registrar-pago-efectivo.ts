import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Reloj } from '../../../compartido/reloj/reloj';
import { Cobro } from '../dominio/cobro';
import { Pago } from '../dominio/pago';
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
  ) {}

  ejecutar(solicitud: SolicitudPago): Promise<ResultadoPago> {
    return this.transaccion.ejecutar(
      solicitud.cobroId,
      solicitud.sedeId,
      async ({ cobro, cobros, pagos }) => {
        if (!cobro)
          throw new ErrorDominio(
            'COBRO_NO_ENCONTRADO',
            'El cobro no existe en esta sede.',
          );

        const pagado = cobro.transicionar('PAGADO');
        const pago = Pago.crear({
          cobroId: solicitud.cobroId,
          referencia: solicitud.referencia,
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

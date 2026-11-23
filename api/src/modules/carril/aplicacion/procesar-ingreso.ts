import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Reloj } from '../../../compartido/reloj/reloj';
import {
  LectorPlaca,
  type SolicitudLectura,
} from '../../vehiculos/aplicacion/lector-placa';
import { BarreraCarril } from './barrera-carril';
import { EstadoCarrilStore } from './estado-carril.store';
import {
  TransaccionIngreso,
  type ResultadoIngreso,
} from './transaccion-ingreso';

/** Publica estado y ordena la barrera solo después de confirmar la persistencia. */
export class ProcesarIngreso {
  constructor(
    private readonly lector: LectorPlaca,
    private readonly reloj: Reloj,
    private readonly transaccion: TransaccionIngreso,
    private readonly estado: EstadoCarrilStore,
    private readonly barrera: BarreraCarril,
  ) {}

  async ejecutar(
    sedeId: number,
    carrilId: number,
    solicitud: SolicitudLectura,
    operador?: string,
  ): Promise<ResultadoIngreso> {
    const lectura = await this.lector.leer(solicitud);
    const resultado = await this.transaccion.ejecutar({
      sedeId,
      carrilId,
      lectura,
      operador,
      ocurridoEn: this.reloj.ahora(),
    });
    const actual = await this.estado.obtener();
    await this.estado.guardar({
      ...actual,
      vehiculoPresente: true,
      sentido: 'ENTRADA',
      ultimaLectura: lectura.placa
        ? {
            placa: lectura.placa.valor,
            confianza: lectura.confianza,
            origen: lectura.origen,
          }
        : null,
      ultimoResultado: resultado,
      requiereValidacionManual:
        resultado.resultado === 'REQUIERE_LECTURA_MANUAL',
    });
    try {
      if (resultado.resultado === 'AUTORIZADO')
        await this.barrera.abrir(resultado.motivo);
      else await this.barrera.denegar(resultado.motivo);
    } catch {
      throw new ErrorDominio(
        'BARRERA_NO_DISPONIBLE',
        'La operación quedó registrada, pero no se pudo confirmar la orden de barrera',
      );
    }
    return resultado;
  }
}

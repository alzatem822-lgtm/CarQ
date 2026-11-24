import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Cobro } from '../dominio/cobro';
import { CobroRepository } from './cobro.repository';

interface SolicitudAnulacion {
  cobroId: number;
  sedeId: number;
  usuario: string;
  motivo: string;
}

export class AnularCobro {
  constructor(
    private readonly cobros: Pick<
      CobroRepository,
      'buscarPorId' | 'actualizarEstado'
    >,
  ) {}

  async ejecutar({
    cobroId,
    sedeId,
    usuario,
    motivo,
  }: SolicitudAnulacion): Promise<Cobro | null> {
    const cobro = await this.cobros.buscarPorId(cobroId, sedeId);
    if (!cobro) return null;

    const anulado = cobro.transicionar('ANULADO', { usuario, motivo });
    const actualizado = await this.cobros.actualizarEstado(anulado, 'PENDIENTE');
    if (!actualizado) {
      throw new ErrorDominio(
        'ESTADO_COBRO_INVALIDO',
        'La anulación requiere un cobro pendiente.',
      );
    }

    return actualizado;
  }
}

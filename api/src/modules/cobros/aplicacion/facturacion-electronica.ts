import type { Cobro } from '../dominio/cobro';

export type CobroPagadoFacturable = Readonly<
  Pick<Cobro, 'sedeId' | 'diaOperativo' | 'tarifaAplicada'> & {
    id: number;
    estado: 'PAGADO';
  }
>;

export interface DocumentoSoporte {
  readonly referencia: string;
  readonly estado: 'PENDIENTE' | 'EMITIDO' | 'RECHAZADO';
}

export interface FacturacionElectronica {
  emitir(cobro: CobroPagadoFacturable): Promise<DocumentoSoporte>;
  consultarEstado(referencia: string): Promise<DocumentoSoporte | null>;
}

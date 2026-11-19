import type { Cobro } from '../dominio/cobro';

export interface SolicitudPasarelaPagos {
  readonly cobroId: number;
  readonly monto: Cobro['tarifaAplicada'];
  readonly referencia: string;
}

export type EstadoPagoPasarela = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface ResultadoPasarelaPagos {
  readonly referencia: string;
  readonly estado: EstadoPagoPasarela;
}

export interface NotificacionPasarelaPagos {
  readonly referencia: string;
  readonly estado: Exclude<EstadoPagoPasarela, 'PENDIENTE'>;
}

export interface PasarelaPagos {
  iniciar(solicitud: SolicitudPasarelaPagos): Promise<ResultadoPasarelaPagos>;
  consultar(referencia: string): Promise<ResultadoPasarelaPagos | null>;
  registrarNotificacion(notificacion: NotificacionPasarelaPagos): Promise<void>;
}

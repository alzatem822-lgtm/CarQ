/** Sentido en que se usa el carril; lo define el selector de la pantalla. */
export type SentidoCarril = 'ENTRADA' | 'SALIDA';

export type EstadoBarrera = 'ABIERTA' | 'CERRADA';

export type OrigenLectura = 'SIMULADO' | 'MANUAL' | 'OCR';

export interface UltimaLectura {
  readonly placa: string;
  readonly confianza: number;
  readonly origen: OrigenLectura;
}

/**
 * Lo que la pantalla del carril consulta cada segundo: presencia del
 * vehículo, estado de la barrera con su motivo y la última lectura.
 * Es un estado transitorio: no se guarda en base de datos.
 */
export interface EstadoCarril {
  readonly vehiculoPresente: boolean;
  readonly sentido: SentidoCarril | null;
  readonly ultimaLectura: UltimaLectura | null;
  readonly barrera: {
    readonly estado: EstadoBarrera;
    readonly motivo: string | null;
  };
  readonly requiereValidacionManual: boolean;
}

/** Carril libre, barrera cerrada y sin lecturas. */
export function estadoCarrilInicial(): EstadoCarril {
  return {
    vehiculoPresente: false,
    sentido: null,
    ultimaLectura: null,
    barrera: { estado: 'CERRADA', motivo: null },
    requiereValidacionManual: false,
  };
}
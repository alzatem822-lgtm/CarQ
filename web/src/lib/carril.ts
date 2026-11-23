import { peticion } from "./cliente-http";

export interface EstadoCarril {
  readonly vehiculoPresente: boolean;
  readonly sentido: "ENTRADA" | "SALIDA" | null;
  readonly ultimaLectura: {
    readonly placa: string;
    readonly confianza: number;
    readonly origen: "SIMULADO" | "MANUAL" | "OCR";
  } | null;
  readonly ultimoResultado: {
    readonly resultado: "AUTORIZADO" | "RECHAZADO" | "REQUIERE_LECTURA_MANUAL";
    readonly motivo: string;
  } | null;
  readonly barrera: {
    readonly estado: "ABIERTA" | "CERRADA";
    readonly motivo: string | null;
  };
  readonly requiereValidacionManual: boolean;
}

export function consultarEstadoCarril(
  signal: AbortSignal,
): Promise<EstadoCarril> {
  return peticion("/carril/estado", { signal, cache: "no-store" });
}

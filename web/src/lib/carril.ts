import { peticion } from "./cliente-http";

export interface OcupacionCarril {
  readonly cupos: {
    readonly tipoVehiculo: string;
    readonly ocupacion: number;
    readonly maximo: number;
  }[];
}

export function consultarOcupacionCarril(
  signal: AbortSignal,
): Promise<OcupacionCarril> {
  return peticion("/carril/ocupacion", { signal, cache: "no-store" });
}

export interface EstadoCarril {
  readonly simulacionHabilitada: boolean;
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

export function simularLlegadaCarril(
  signal: AbortSignal,
): Promise<{ vehiculoPresente: true }> {
  return peticion("/carril/simulacion/llegada", { method: "POST", signal });
}

export function consultarEstadoCarril(
  signal: AbortSignal,
): Promise<EstadoCarril> {
  return peticion("/carril/estado", { signal, cache: "no-store" });
}

/** Envía la imagen sin fijar Content-Type: el navegador agrega el boundary. */
export function procesarImagenCarril(
  sentido: "ENTRADA" | "SALIDA",
  imagen: Blob,
  signal: AbortSignal,
): Promise<NonNullable<EstadoCarril["ultimoResultado"]>> {
  const cuerpo = new FormData();
  cuerpo.append(
    "imagen",
    imagen,
    imagen instanceof File ? imagen.name : "captura.jpg",
  );
  return peticion(
    sentido === "ENTRADA" ? "/carril/ingreso" : "/carril/salida",
    {
      method: "POST",
      body: cuerpo,
      signal,
    },
  );
}

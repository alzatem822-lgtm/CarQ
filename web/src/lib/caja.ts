import { peticion } from "./cliente-http";

export interface CobroCaja {
  readonly id: number;
  readonly placa: string;
  readonly tipoVehiculo: string;
  readonly diaOperativo: string;
  readonly franja: "DIURNA" | "NOCTURNA";
  readonly tarifaAplicada: number;
  readonly estado: "PENDIENTE" | "PAGADO" | "ANULADO";
}

export const monedaCaja = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function buscarPendientes(placa: string, signal: AbortSignal) {
  const parametros = new URLSearchParams({ placa });
  return peticion<{ cobros: CobroCaja[] }>(`/cobros/pendientes?${parametros}`, {
    signal,
  });
}

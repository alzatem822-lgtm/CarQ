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

export interface ResultadoPagoCaja {
  readonly cobro: CobroCaja;
  readonly pago: {
    readonly id: number;
    readonly referencia: string;
    readonly monto: number;
    readonly operador: string;
    readonly fecha: string;
  };
}

export function registrarPagoEfectivo(cobroId: number, referencia: string) {
  return peticion<ResultadoPagoCaja>("/pagos/efectivo", {
    method: "POST",
    body: JSON.stringify({ cobroId, referencia }),
  });
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

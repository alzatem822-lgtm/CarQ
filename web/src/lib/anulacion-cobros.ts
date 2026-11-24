import type { CobroCaja } from "./caja";
import { peticion } from "./cliente-http";

interface CobroAnulado extends CobroCaja {
  readonly estado: "ANULADO";
  readonly anuladoPor: string;
  readonly motivoAnulacion: string;
}

export function anularCobro(cobroId: number, motivo: string) {
  return peticion<CobroAnulado>(`/cobros/${cobroId}/anulacion`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
}

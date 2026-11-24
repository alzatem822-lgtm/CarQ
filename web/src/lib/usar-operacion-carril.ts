"use client";

import { useRef, useState } from "react";

type OrigenOperacion = "captura" | "manual";

export interface ControlOperacionCarril {
  readonly origen: OrigenOperacion | null;
  iniciar(origen: OrigenOperacion): boolean;
  finalizar(): void;
}

/** Reserva el envío antes del primer await para coordinar todos los paneles. */
export function useOperacionCarril(): ControlOperacionCarril {
  const ocupado = useRef(false);
  const [origen, setOrigen] = useState<OrigenOperacion | null>(null);
  return {
    origen,
    iniciar(nuevo) {
      if (ocupado.current) return false;
      ocupado.current = true;
      setOrigen(nuevo);
      return true;
    },
    finalizar() {
      ocupado.current = false;
      setOrigen(null);
    },
  };
}

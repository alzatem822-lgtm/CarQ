"use client";

import { useEffect, useState } from "react";
import { consultarEstadoCarril, type EstadoCarril } from "./carril";
import { mensajeDeErrorApi } from "./mensaje-error-api";
import { iniciarSondeoCarril } from "./sondeo-carril";

interface EstadoSondeo {
  readonly estado: EstadoCarril | null;
  readonly cargando: boolean;
  readonly error: string | null;
}

/** Mantiene el estado de Carril sincronizado mientras la pantalla está montada. */
export function useEstadoCarril(): EstadoSondeo {
  const [sondeo, setSondeo] = useState<EstadoSondeo>({
    estado: null,
    cargando: true,
    error: null,
  });

  useEffect(
    () =>
      iniciarSondeoCarril(
        consultarEstadoCarril,
        (estado) => setSondeo({ estado, cargando: false, error: null }),
        (error) =>
          setSondeo({
            estado: null,
            cargando: false,
            error: mensajeDeErrorApi(
              error,
              "No pudimos actualizar el carril. Reintentando conexión…",
            ),
          }),
      ),
    [],
  );

  return sondeo;
}

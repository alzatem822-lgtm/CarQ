"use client";

import { useEffect, useState } from "react";
import { consultarOcupacionCarril, type OcupacionCarril } from "./carril";
import { iniciarSondeoCarril } from "./sondeo-carril";
import { mensajeDeErrorApi } from "./mensaje-error-api";

interface EstadoOcupacion {
  datos: OcupacionCarril | null;
  cargando: boolean;
  error: string | null;
}

/** Actualiza la ocupación sin reutilizar datos antiguos cuando falla la consulta. */
export function useOcupacionCarril(): EstadoOcupacion {
  const [estado, actualizar] = useState<EstadoOcupacion>({
    datos: null,
    cargando: true,
    error: null,
  });
  useEffect(
    () =>
      iniciarSondeoCarril(
        consultarOcupacionCarril,
        (datos) => actualizar({ datos, cargando: false, error: null }),
        (error) =>
          actualizar({
            datos: null,
            cargando: false,
            error: mensajeDeErrorApi(
              error,
              "No pudimos consultar los cupos. Reintentando conexión…",
            ),
          }),
      ),
    [],
  );
  return estado;
}

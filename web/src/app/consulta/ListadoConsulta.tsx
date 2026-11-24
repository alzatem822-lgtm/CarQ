"use client";

import { useEffect, useState } from "react";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { Tabla, type Columna } from "@/componentes/interfaz/Tabla";
import type { PaginaConsulta } from "@/lib/consulta";
import {
  FILTROS_VACIOS,
  type OpcionesFiltros,
  type ValoresFiltros,
} from "@/lib/filtros-consulta";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import { FiltrosConsulta } from "./FiltrosConsulta";
import estilos from "./Consulta.module.css";

interface Solicitud<E extends string> {
  readonly filtros: ValoresFiltros<E>;
  readonly pagina: number;
}

interface Props<T, E extends string> {
  readonly titulo: string;
  readonly opciones: OpcionesFiltros<E>;
  readonly columnas: Columna<T>[];
  readonly consultar: (
    filtros: ValoresFiltros<E>,
    pagina: number,
    signal: AbortSignal,
  ) => Promise<PaginaConsulta<T>>;
}

type Respuesta<T, E extends string> = {
  readonly solicitud: Solicitud<E>;
} & (
  | { readonly estado: "lista"; readonly datos: PaginaConsulta<T> }
  | { readonly estado: "error"; readonly mensaje: string }
);

export function ListadoConsulta<T extends { id: number }, E extends string>({
  titulo,
  opciones,
  columnas,
  consultar,
}: Props<T, E>) {
  const [solicitud, setSolicitud] = useState<Solicitud<E>>({
    filtros: FILTROS_VACIOS,
    pagina: 1,
  });
  const [respuesta, setRespuesta] = useState<Respuesta<T, E> | null>(null);
  const actual = respuesta?.solicitud === solicitud ? respuesta : null;

  useEffect(() => {
    const control = new AbortController();
    const signal = AbortSignal.any([control.signal, AbortSignal.timeout(20000)]);
    consultar(solicitud.filtros, solicitud.pagina, signal).then(
      (datos) => {
        if (!control.signal.aborted) setRespuesta({ solicitud, estado: "lista", datos });
      },
      (error: unknown) => {
        if (control.signal.aborted) return;
        const mensaje = mensajeDeErrorApi(error, "No pudimos cargar los registros. Intenta de nuevo.");
        setRespuesta({ solicitud, estado: "error", mensaje });
      },
    );

    return () => control.abort();
  }, [consultar, solicitud]);

  function cambiarPagina(desplazamiento: number) {
    setSolicitud({ ...solicitud, pagina: solicitud.pagina + desplazamiento });
  }

  return (
    <>
      <FiltrosConsulta
        opciones={opciones}
        aplicar={(filtros) => setSolicitud({ filtros, pagina: 1 })}
      />
      <div aria-busy={!actual}>
        {!actual && <p className={estilos.estado} role="status">Cargando registros…</p>}
        {actual?.estado === "error" && (
          <div className={estilos.error}>
            <Alerta tono="peligro">{actual.mensaje}</Alerta>
            <button
              type="button"
              className="boton-secundario"
              onClick={() => setSolicitud({ ...solicitud })}
            >
              Reintentar
            </button>
          </div>
        )}
        {actual?.estado === "lista" && (
          <>
            <div className={estilos.tabla} tabIndex={0} role="region" aria-label={`Tabla de ${titulo.toLowerCase()}`}>
              <Tabla
                columnas={columnas}
                filas={actual.datos.elementos}
                clave={(fila) => fila.id}
                mensajeVacio="No hay registros para los filtros aplicados."
              />
            </div>
            <nav className={estilos.paginacion} aria-label="Paginación de resultados">
              <button
                type="button"
                className="boton-secundario"
                disabled={solicitud.pagina === 1}
                onClick={() => cambiarPagina(-1)}
              >
                Anterior
              </button>
              <span>Página {solicitud.pagina}</span>
              <button
                type="button"
                className="boton-secundario"
                disabled={!actual.datos.haySiguiente}
                onClick={() => cambiarPagina(1)}
              >
                Siguiente
              </button>
            </nav>
          </>
        )}
      </div>
    </>
  );
}

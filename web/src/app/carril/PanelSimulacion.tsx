"use client";

import { useEffect, useRef, useState } from "react";
import { simularLlegadaCarril } from "@/lib/carril";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import { Alerta } from "@/componentes/interfaz/Alerta";

/** Disponible únicamente cuando el servidor habilita el sensor simulado. */
export function PanelSimulacion() {
  const solicitud = useRef<AbortController | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  useEffect(() => () => solicitud.current?.abort(), []);

  async function simular() {
    if (solicitud.current) return;
    const control = new AbortController();
    solicitud.current = control;
    setEnviando(true);
    setError(null);
    setConfirmado(false);
    try {
      await simularLlegadaCarril(
        AbortSignal.any([control.signal, AbortSignal.timeout(5000)]),
      );
      if (!control.signal.aborted) setConfirmado(true);
    } catch (fallo) {
      if (!control.signal.aborted)
        setError(
          mensajeDeErrorApi(
            fallo,
            "No pudimos simular la llegada. Intenta de nuevo.",
          ),
        );
    } finally {
      if (!control.signal.aborted) setEnviando(false);
      solicitud.current = null;
    }
  }

  return (
    <section
      className="panel-contexto"
      aria-labelledby="titulo-simulacion"
      aria-busy={enviando}
    >
      <div>
        <h2 id="titulo-simulacion">Simulación de llegada</h2>
        <p>
          Notifica presencia de un vehículo. No registra un ingreso ni abre la
          barrera.
        </p>
        {error && <Alerta tono="peligro">{error}</Alerta>}
        {confirmado && (
          <p role="status">
            Llegada simulada. El estado del carril se actualizará
            automáticamente.
          </p>
        )}
        <button
          type="button"
          className="boton-secundario"
          disabled={enviando}
          onClick={() => void simular()}
        >
          {enviando ? "Simulando llegada…" : "Simular llegada de vehículo"}
        </button>
      </div>
    </section>
  );
}

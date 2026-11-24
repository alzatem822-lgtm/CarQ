"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { confirmarLecturaManualCarril } from "@/lib/carril";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import type { ControlOperacionCarril } from "@/lib/usar-operacion-carril";
import estilos from "./Carril.module.css";

export function PanelLecturaManual({
  sentido,
  sugerida,
  operacion,
}: {
  sentido: "ENTRADA" | "SALIDA";
  sugerida: string;
  operacion: ControlOperacionCarril;
}) {
  const [editada, setEditada] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const solicitud = useRef<AbortController | null>(null);
  const placa = editada ?? sugerida;
  const enviando = operacion.origen === "manual";
  const destino = sentido === "ENTRADA" ? "entrada" : "salida";

  useEffect(() => () => solicitud.current?.abort(), []);

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (solicitud.current || operacion.origen) return;
    const normalizada = placa.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z]{3}\d{2}[A-Z\d]$/.test(normalizada)) {
      setError(
        "Escribe una placa válida: ABC123 para carro o ABC12A para moto.",
      );
      setResultado(null);
      return;
    }
    if (!operacion.iniciar("manual")) return;
    const control = new AbortController();
    solicitud.current = control;
    setError(null);
    setResultado(null);
    try {
      const respuesta = await confirmarLecturaManualCarril(
        sentido,
        normalizada,
        AbortSignal.any([control.signal, AbortSignal.timeout(20000)]),
      );
      if (control.signal.aborted) return;
      const etiqueta =
        respuesta.resultado === "AUTORIZADO"
          ? "autorizada"
          : respuesta.resultado === "RECHAZADO"
            ? "rechazada"
            : "pendiente de validación";
      setResultado(
        `${sentido === "ENTRADA" ? "Entrada" : "Salida"} ${etiqueta}: ${respuesta.motivo}`,
      );
    } catch (fallo) {
      if (!control.signal.aborted)
        setError(
          mensajeDeErrorApi(
            fallo,
            "No pudimos confirmar el resultado. La operación pudo registrarse; revisa el estado del carril antes de repetirla.",
          ),
        );
    } finally {
      solicitud.current = null;
      operacion.finalizar();
    }
  }

  return (
    <section className={estilos.manual} aria-labelledby="titulo-manual">
      <div>
        <span className={estilos.numero}>04 / VALIDACIÓN</span>
        <h2 id="titulo-manual">Lectura manual</h2>
        <p className={estilos.descripcion}>
          Revisa la placa sugerida o digítala para confirmar la {destino}. Se
          comprobarán los cupos, la estancia y los cobros correspondientes.
        </p>
      </div>
      <form onSubmit={(evento) => void confirmar(evento)} aria-busy={enviando}>
        <div className={estilos.controlesManuales}>
          <label htmlFor="placa-manual">
            Placa del vehículo
            <input
              id="placa-manual"
              type="text"
              placeholder="ABC123 o ABC12A"
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="ayuda-lectura-manual"
              aria-invalid={error ? true : undefined}
              disabled={operacion.origen !== null}
              value={placa}
              onChange={(evento) => {
                setEditada(evento.target.value);
                setError(null);
                setResultado(null);
              }}
            />
          </label>
          <button
            type="submit"
            className="boton-secundario"
            disabled={operacion.origen !== null || !placa.trim()}
          >
            {enviando
              ? "Confirmando placa…"
              : `Confirmar placa para ${destino}`}
          </button>
          <p id="ayuda-lectura-manual" className={estilos.nota}>
            La confirmación quedará registrada como lectura manual con tu
            usuario.
          </p>
        </div>
        {error && <Alerta tono="peligro">{error}</Alerta>}
        {resultado && (
          <p role="status" className={estilos.resultadoManual}>
            {resultado}
          </p>
        )}
      </form>
    </section>
  );
}

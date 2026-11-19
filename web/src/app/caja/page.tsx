"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Cabecera } from "@/componentes/Cabecera";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { CampoFormulario } from "@/componentes/interfaz/CampoFormulario";
import { buscarPendientes, monedaCaja, type CobroCaja } from "@/lib/caja";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import { DetalleCobro } from "./DetalleCobro";
import estilos from "./Caja.module.css";

type EstadoBusqueda = "inicial" | "buscando" | "resultado" | "error";

export default function CajaPage() {
  const [placa, setPlaca] = useState("");
  const [placaConsultada, setPlacaConsultada] = useState("");
  const [estado, setEstado] = useState<EstadoBusqueda>("inicial");
  const [error, setError] = useState<string | null>(null);
  const [cobros, setCobros] = useState<CobroCaja[]>([]);
  const [seleccion, seleccionar] = useState<CobroCaja | null>(null);
  const solicitud = useRef<AbortController | null>(null);

  useEffect(() => () => solicitud.current?.abort(), []);

  async function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    solicitud.current?.abort();
    setCobros([]);
    seleccionar(null);
    setError(null);
    const valor = placa.trim().toUpperCase();
    if (!/^[A-Z]{3}[0-9]{2}[A-Z0-9]$/.test(valor)) {
      setEstado("error");
      setError("Ingresa una placa con formato ABC123 o ABC12A.");
      return;
    }

    const control = new AbortController();
    solicitud.current = control;
    setPlacaConsultada(valor);
    setEstado("buscando");
    try {
      const { cobros } = await buscarPendientes(
        valor,
        AbortSignal.any([control.signal, AbortSignal.timeout(20000)]),
      );
      if (control.signal.aborted) return;
      setCobros(cobros);
      setEstado("resultado");
    } catch (error) {
      if (control.signal.aborted) return;
      setEstado("error");
      setError(
        mensajeDeErrorApi(
          error,
          "No pudimos buscar los cobros. Intenta de nuevo.",
        ),
      );
    }
  }

  return (
    <div className="pagina">
      <Cabecera
        titulo="Caja"
        descripcion="Consulta cobros pendientes y registra pagos en efectivo."
      />
      <div className={estilos.paneles}>
        <section className={estilos.panel} aria-labelledby="titulo-busqueda">
          <h2 id="titulo-busqueda">Buscar cobros pendientes</h2>
          <form className={estilos.busqueda} onSubmit={buscar}>
            <CampoFormulario
              etiqueta="Placa"
              name="placa"
              value={placa}
              maxLength={6}
              autoComplete="off"
              onChange={(evento) => setPlaca(evento.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="boton-primario"
              disabled={estado === "buscando"}
            >
              Buscar
            </button>
          </form>
          {estado === "buscando" && (
            <p className={estilos.estado} role="status">
              Buscando cobros…
            </p>
          )}
          {error && <Alerta tono="peligro">{error}</Alerta>}
          {estado === "resultado" && cobros.length === 0 && (
            <p className={estilos.estado} role="status">
              La placa {placaConsultada} no tiene cobros pendientes.
            </p>
          )}
          {cobros.length > 0 && (
            <ul
              className={estilos.lista}
              aria-label={`Cobros de ${placaConsultada}`}
            >
              {cobros.map((cobro) => (
                <li key={cobro.id}>
                  <button
                    type="button"
                    className={estilos.fila}
                    aria-pressed={seleccion?.id === cobro.id}
                    onClick={() => seleccionar(cobro)}
                  >
                    <span>
                      <strong>{cobro.placa}</strong> · {cobro.diaOperativo}
                    </span>
                    <span>{monedaCaja.format(cobro.tarifaAplicada)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        {seleccion && <DetalleCobro cobro={seleccion} />}
      </div>
    </div>
  );
}

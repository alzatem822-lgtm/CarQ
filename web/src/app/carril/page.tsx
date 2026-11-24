"use client";

import { useState } from "react";
import { Cabecera } from "@/componentes/Cabecera";
import { Icono } from "@/componentes/Icono";
import { InsigniaEstado } from "@/componentes/interfaz/InsigniaEstado";
import { useEstadoCarril } from "@/lib/usar-estado-carril";
import { useOcupacionCarril } from "@/lib/usar-ocupacion-carril";
import type { EstadoCarril } from "@/lib/carril";
import estilos from "./Carril.module.css";
import { CapturaCamara } from "./CapturaCamara";
import { PanelSimulacion } from "./PanelSimulacion";
import { PanelLecturaManual } from "./PanelLecturaManual";
import {
  useOperacionCarril,
  type ControlOperacionCarril,
} from "@/lib/usar-operacion-carril";

type SentidoCarril = "ENTRADA" | "SALIDA";

function LecturaCarril({
  sentido,
  estado,
  cargando,
  error,
  operacionEnCurso,
}: {
  sentido: SentidoCarril;
  estado: EstadoCarril | null;
  cargando: boolean;
  error: string | null;
  operacionEnCurso: ControlOperacionCarril;
}) {
  const operacion = sentido === "ENTRADA" ? "entrada" : "salida";
  const lectura = error ? null : estado?.ultimaLectura;
  const sinLectura = cargando
    ? "Consultando…"
    : error
      ? "No disponible"
      : "Sin lectura";
  const requiereManual = !error && estado?.requiereValidacionManual;
  return (
    <section
      className={estilos.lectura}
      aria-labelledby="titulo-lectura"
      data-sentido={sentido}
    >
      <header className={estilos.encabezadoPanel}>
        <div>
          <span className={estilos.numero}>01 / LECTURA</span>
          <h2 id="titulo-lectura">Identifica el vehículo</h2>
        </div>
        <span className={estilos.destino}>Captura de {operacion}</span>
      </header>
      <CapturaCamara
        operacion={operacionEnCurso}
        sentido={sentido}
        vehiculoPresente={
          error || cargando ? null : (estado?.vehiculoPresente ?? null)
        }
      />
      <div
        className={estilos.datosLectura}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <span>Placa</span>
          <strong className={lectura ? estilos.placaLeida : undefined}>
            {lectura?.placa || sinLectura}
          </strong>
        </div>
        <div>
          <span>Confianza</span>
          <strong
            className={requiereManual ? estilos.confianzaManual : undefined}
          >
            {lectura
              ? new Intl.NumberFormat("es-CO", {
                  style: "percent",
                  maximumFractionDigits: 2,
                }).format(lectura.confianza)
              : sinLectura}
          </strong>
        </div>
      </div>
      {requiereManual && (
        <div className={estilos.avisoManual} role="status">
          <InsigniaEstado estado="lecturaManual" />
          <p>La lectura requiere validación del operador antes de continuar.</p>
        </div>
      )}
    </section>
  );
}

export default function CarrilPage() {
  const [sentido, setSentido] = useState<SentidoCarril>("ENTRADA");
  const { estado, cargando, error } = useEstadoCarril();
  const ocupacion = useOcupacionCarril();
  const operacionEnCurso = useOperacionCarril();
  return (
    <div className="pagina">
      <Cabecera
        seccion="OPERACIÓN DEL PARQUEADERO"
        titulo="Control del carril"
        descripcion="Selecciona el sentido y prepara la lectura del vehículo."
      >
        <span className={estado ? "estado-disponible" : "estado-pendiente"}>
          {cargando
            ? "Consultando estado…"
            : error
              ? "Estado no disponible"
              : "Sondeo conectado"}
        </span>
      </Cabecera>
      <section className={estilos.conexion} aria-label="Conexión con el carril">
        <Icono nombre="carril" size={20} />
        <p role="status">
          {cargando
            ? "Consultando presencia del vehículo…"
            : (error ??
              (estado?.vehiculoPresente
                ? "Vehículo presente en el carril"
                : "Carril libre"))}
        </p>
      </section>
      {estado?.simulacionHabilitada === true && !error && <PanelSimulacion />}
      <fieldset
        className={estilos.selector}
        disabled={operacionEnCurso.origen !== null}
      >
        <legend>Sentido del carril</legend>
        <div className={estilos.opciones}>
          {(["ENTRADA", "SALIDA"] as const).map((opcion) => (
            <label key={opcion} className={estilos.opcion}>
              <input
                type="radio"
                name="sentido-carril"
                value={opcion}
                checked={sentido === opcion}
                onChange={() => setSentido(opcion)}
              />
              <span className={estilos.opcionContenido}>
                <span
                  className={
                    opcion === "ENTRADA" ? estilos.flechaEntrada : undefined
                  }
                >
                  <Icono nombre="flecha" size={20} />
                </span>
                <span>
                  <strong>{opcion === "ENTRADA" ? "Entrada" : "Salida"}</strong>
                  <small>
                    {opcion === "ENTRADA"
                      ? "Ingreso al parqueadero"
                      : "Salida del parqueadero"}
                  </small>
                </span>
                <span className={estilos.marcaSeleccion} aria-hidden="true" />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={estilos.operacionSeleccionada} role="status">
        Sentido seleccionado:{" "}
        <strong>{sentido === "ENTRADA" ? "Entrada" : "Salida"}</strong>
      </p>
      <div className={estilos.distribucion}>
        <LecturaCarril
          operacionEnCurso={operacionEnCurso}
          sentido={sentido}
          estado={estado}
          cargando={cargando}
          error={error}
        />
        <div className={estilos.lateral}>
          <section className={estilos.panel} aria-labelledby="titulo-barrera">
            <header className={estilos.encabezadoPanel}>
              <div>
                <span className={estilos.numero}>02 / PASO</span>
                <h2 id="titulo-barrera">Barrera del carril</h2>
              </div>
              <Icono nombre="carril" size={22} />
            </header>
            <div
              className={estilos.estadoBarrera}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {estado && !error ? (
                <>
                  <InsigniaEstado
                    estado={
                      estado.barrera.estado === "ABIERTA"
                        ? "barreraAbierta"
                        : "barreraCerrada"
                    }
                  />
                  <p
                    className={`${estilos.valorBarrera} ${estado.barrera.estado === "ABIERTA" ? estilos.abierta : estilos.cerrada}`}
                  >
                    {estado.barrera.estado === "ABIERTA"
                      ? "Abierta"
                      : "Cerrada"}
                  </p>
                  <p className={estilos.motivoBarrera}>
                    <span>Motivo</span>
                    {estado.barrera.motivo ?? "Sin motivo informado"}
                  </p>
                </>
              ) : (
                <>
                  <p className={estilos.sinDatos}>
                    {cargando ? "Consultando barrera…" : "Estado no disponible"}
                  </p>
                  <p className={estilos.descripcion}>
                    {cargando
                      ? "Esperando el estado actual del carril."
                      : "No se puede confirmar el estado de la barrera. Reintentando conexión…"}
                  </p>
                </>
              )}
            </div>
          </section>
          <section className={estilos.panel} aria-labelledby="titulo-cupos">
            <header className={estilos.encabezadoPanel}>
              <div>
                <span className={estilos.numero}>03 / DISPONIBILIDAD</span>
                <h2 id="titulo-cupos">Cupos por tipo</h2>
              </div>
              <Icono nombre="carro" size={22} />
            </header>
            <dl className={estilos.cupos} aria-live="polite" aria-atomic="true">
              {(["CARRO", "MOTO"] as const).map((tipo) => {
                const cupo = ocupacion.datos?.cupos.find(
                  (actual) => actual.tipoVehiculo === tipo,
                );
                return (
                  <div key={tipo}>
                    <dt>{tipo === "CARRO" ? "Carros" : "Motos"}</dt>
                    <dd>
                      {cupo ? (
                        <>
                          <strong>
                            {cupo.ocupacion} / {cupo.maximo}
                          </strong>
                          {cupo.ocupacion >= cupo.maximo && (
                            <span className={estilos.lleno}>
                              <InsigniaEstado estado="lleno" />
                            </span>
                          )}
                        </>
                      ) : ocupacion.cargando ? (
                        "Consultando…"
                      ) : ocupacion.error ? (
                        "No disponible"
                      ) : (
                        "Sin configuración"
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className={estilos.descripcion}>
              {ocupacion.error ??
                (ocupacion.cargando
                  ? "Consultando ocupación y capacidad…"
                  : "Vehículos presentes / capacidad configurada por tipo.")}
            </p>
          </section>
        </div>
      </div>
      <PanelLecturaManual
        key={sentido}
        sentido={sentido}
        sugerida={
          !error &&
          estado?.requiereValidacionManual &&
          estado.sentido === sentido
            ? (estado.ultimaLectura?.placa ?? "")
            : ""
        }
        operacion={operacionEnCurso}
      />
    </div>
  );
}

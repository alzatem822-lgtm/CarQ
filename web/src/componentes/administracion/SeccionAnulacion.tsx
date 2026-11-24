"use client";

import { useState, type FormEvent } from "react";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { CampoFormulario } from "@/componentes/interfaz/CampoFormulario";
import { monedaCaja, type CobroCaja } from "@/lib/caja";
import { anularCobro } from "@/lib/anulacion-cobros";
import { consultarCobros, type PaginaConsulta } from "@/lib/consulta";
import { FILTROS_VACIOS } from "@/lib/filtros-consulta";
import { mensajeDeErrorApi } from "@/lib/mensaje-error-api";
import estilos from "./SeccionAnulacion.module.css";

interface Busqueda {
  readonly placa: string;
  readonly pagina: number;
  readonly datos: PaginaConsulta<CobroCaja>;
}

interface Props {
  readonly onDirtyChange: (modificado: boolean) => void;
  readonly onSavingChange: (guardando: boolean) => void;
}

function buscarPendientes(placa: string, pagina: number) {
  return consultarCobros(
    { ...FILTROS_VACIOS, placa, estado: "PENDIENTE" },
    pagina,
    AbortSignal.timeout(20000),
  );
}

export function SeccionAnulacion({ onDirtyChange, onSavingChange }: Props) {
  const [placa, setPlaca] = useState("");
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null);
  const [seleccion, setSeleccion] = useState<CobroCaja | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string>();
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ocupado = consultando || guardando;

  function seleccionar(cobro: CobroCaja | null) {
    setSeleccion(cobro);
    setMotivo("");
    setErrorMotivo(undefined);
    onDirtyChange(false);
  }

  async function consultar(placaBuscada: string, pagina: number) {
    setConsultando(true);
    setError("");
    try {
      const datos = await buscarPendientes(placaBuscada, pagina);
      setBusqueda({ placa: placaBuscada, pagina, datos });
      seleccionar(null);
    } catch (error) {
      setError(
        mensajeDeErrorApi(error, "No se pudieron consultar los cobros."),
      );
    } finally {
      setConsultando(false);
    }
  }

  function buscar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado) return;
    setBusqueda(null);
    setMensaje("");
    seleccionar(null);
    void consultar(placa.trim().toUpperCase(), 1);
  }

  async function anular(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!seleccion || !busqueda || ocupado) return;

    const motivoFinal = motivo.trim();
    if (!motivoFinal) {
      setErrorMotivo("Indica el motivo de la anulación.");
      return;
    }

    if (
      !window.confirm(
        `¿Anular el cobro de ${seleccion.placa} del ${seleccion.diaOperativo}?`,
      )
    ) {
      return;
    }

    setGuardando(true);
    onSavingChange(true);
    setError("");
    setMensaje("");
    try {
      const anulado = await anularCobro(seleccion.id, motivoFinal);
      setMensaje(
        `Cobro de ${anulado.placa} del ${anulado.diaOperativo} anulado.`,
      );
      setBusqueda({
        ...busqueda,
        datos: {
          ...busqueda.datos,
          elementos: busqueda.datos.elementos.filter(
            ({ id }) => id !== anulado.id,
          ),
        },
      });
      seleccionar(null);
      await consultar(busqueda.placa, 1);
    } catch (error) {
      setError(
        mensajeDeErrorApi(
          error,
          "No se pudo anular el cobro. Actualiza la búsqueda para comprobar su estado.",
        ),
      );
    } finally {
      setGuardando(false);
      onSavingChange(false);
    }
  }

  return (
    <div className={estilos.seccion} aria-busy={ocupado}>
      <form
        className={estilos.buscar}
        aria-label="Buscar cobros pendientes"
        onSubmit={buscar}
      >
        <CampoFormulario
          etiqueta="Placa"
          value={placa}
          onChange={(evento) =>
            setPlaca(evento.currentTarget.value.toUpperCase())
          }
          placeholder="ABC123"
          autoComplete="off"
          pattern="[A-Z]{3}[0-9]{2}[A-Z0-9]"
          title="Usa el formato ABC123 o ABC12A."
          maxLength={6}
          required
          disabled={ocupado}
        />
        <button type="submit" className="boton-secundario" disabled={ocupado}>
          {consultando ? "Buscando…" : "Buscar pendientes"}
        </button>
      </form>

      {error && <Alerta tono="peligro">{error}</Alerta>}
      {mensaje && <Alerta tono="exito">{mensaje}</Alerta>}

      {busqueda && (
        <>
          {busqueda.datos.elementos.length ? (
            <ul
              className={estilos.cobros}
              aria-label={`Cobros pendientes de ${busqueda.placa}`}
            >
              {busqueda.datos.elementos.map((cobro) => (
                <li key={cobro.id}>
                  <button
                    type="button"
                    className="boton-secundario"
                    aria-pressed={seleccion?.id === cobro.id}
                    disabled={ocupado}
                    onClick={() => {
                      seleccionar(cobro);
                      setError("");
                      setMensaje("");
                    }}
                  >
                    <strong>{cobro.diaOperativo}</strong>
                    <span>{monedaCaja.format(cobro.tarifaAplicada)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">
              No hay cobros pendientes para {busqueda.placa} en esta página.
            </p>
          )}

          {(busqueda.pagina > 1 || busqueda.datos.haySiguiente) && (
            <nav
              className={estilos.paginas}
              aria-label="Paginación de cobros pendientes"
            >
              <button
                type="button"
                className="boton-secundario"
                disabled={ocupado || busqueda.pagina === 1}
                onClick={() =>
                  void consultar(busqueda.placa, busqueda.pagina - 1)
                }
              >
                Anterior
              </button>
              <span>Página {busqueda.pagina}</span>
              <button
                type="button"
                className="boton-secundario"
                disabled={ocupado || !busqueda.datos.haySiguiente}
                onClick={() =>
                  void consultar(busqueda.placa, busqueda.pagina + 1)
                }
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}

      {seleccion && (
        <form
          className={estilos.seccion}
          aria-label="Anular cobro"
          onSubmit={anular}
          noValidate
        >
          <CampoFormulario
            etiqueta="Motivo de la anulación"
            value={motivo}
            error={errorMotivo}
            onChange={(evento) => {
              const valor = evento.currentTarget.value;
              setMotivo(valor);
              setErrorMotivo(undefined);
              onDirtyChange(valor.length > 0);
            }}
            required
            disabled={ocupado}
          />
          <div className={estilos.acciones}>
            <button
              type="button"
              className="boton-secundario"
              disabled={ocupado}
              onClick={() => seleccionar(null)}
            >
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={ocupado}>
              {guardando ? "Anulando…" : "Confirmar anulación"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

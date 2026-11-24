"use client";

import { useState, type FormEvent } from "react";
import { Alerta } from "@/componentes/interfaz/Alerta";
import { CampoFormulario } from "@/componentes/interfaz/CampoFormulario";
import {
  FILTROS_VACIOS,
  type OpcionesFiltros,
  type ValoresFiltros,
} from "@/lib/filtros-consulta";
import estilos from "./FiltrosConsulta.module.css";

interface Props<T extends string> {
  readonly opciones: OpcionesFiltros<T>;
  readonly aplicar: (filtros: ValoresFiltros<T>) => void;
}

export function FiltrosConsulta<T extends string>({
  opciones,
  aplicar,
}: Props<T>) {
  const [valores, setValores] = useState<ValoresFiltros<T>>(FILTROS_VACIOS);
  const [error, setError] = useState("");

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const { desde, hasta } = valores;
    if (desde && hasta && desde > hasta) {
      setError("La fecha inicial debe ser anterior o igual a la final.");
      return;
    }
    setError("");
    aplicar({ ...valores, placa: valores.placa.trim().toUpperCase() });
  }

  function limpiar() {
    setValores(FILTROS_VACIOS);
    setError("");
    aplicar(FILTROS_VACIOS);
  }

  return (
    <form className={estilos.formulario} aria-label="Filtros de consulta" onSubmit={enviar}>
      {opciones.indicacionFechas && (
        <p className={estilos.indicacion}>{opciones.indicacionFechas}</p>
      )}
      <div className={estilos.campos}>
        <CampoFormulario
          etiqueta="Placa"
          name="placa"
          placeholder="ABC123"
          maxLength={6}
          pattern="[A-Z]{3}[0-9]{2}[A-Z0-9]"
          title="Usa el formato ABC123 o ABC12A."
          autoComplete="off"
          value={valores.placa}
          onChange={(evento) =>
            setValores({ ...valores, placa: evento.target.value.toUpperCase() })
          }
        />
        <CampoFormulario
          etiqueta="Desde"
          name="desde"
          type="date"
          max="9998-12-31"
          value={valores.desde}
          onChange={(evento) => setValores({ ...valores, desde: evento.target.value })}
        />
        <CampoFormulario
          etiqueta="Hasta"
          name="hasta"
          type="date"
          max="9998-12-31"
          value={valores.hasta}
          onChange={(evento) => setValores({ ...valores, hasta: evento.target.value })}
        />
        <label className={estilos.estado}>
          {opciones.etiqueta}
          <select
            name="estado"
            value={valores.estado}
            onChange={(evento) => {
              const elegido = opciones.estados.find(({ valor }) => valor === evento.target.value);
              setValores({ ...valores, estado: elegido?.valor ?? "" });
            }}
          >
            <option value="">Todos</option>
            {opciones.estados.map(({ valor, texto }) => (
              <option key={valor} value={valor}>{texto}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      <div className={estilos.acciones}>
        <button type="submit" className="boton-primario">Aplicar filtros</button>
        <button type="button" className="boton-secundario" onClick={limpiar}>Limpiar</button>
      </div>
    </form>
  );
}

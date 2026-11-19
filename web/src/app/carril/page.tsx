"use client";

import { useState } from "react";
import { Cabecera } from "@/componentes/Cabecera";
import { Icono } from "@/componentes/Icono";
import estilos from "./Carril.module.css";

type SentidoCarril = "ENTRADA" | "SALIDA";

function LecturaCarril({ sentido }: { sentido: SentidoCarril }) {
  const operacion = sentido === "ENTRADA" ? "entrada" : "salida";
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
      <div className={estilos.visor}>
        <span className={estilos.iconoVisor}>
          <Icono nombre="carril" size={38} />
        </span>
        <h3>Sin captura</h3>
        <p>La captura de imágenes aún no está disponible.</p>
      </div>
      <div className={estilos.datosLectura}>
        <div>
          <span>Placa</span>
          <strong>Sin lectura</strong>
        </div>
        <div>
          <span>Confianza</span>
          <strong>Sin lectura</strong>
        </div>
      </div>
      <footer className={estilos.pieLectura}>
        <p>La próxima captura se destinará a una {operacion}.</p>
        <button
          type="button"
          className="boton-primario"
          disabled
          aria-describedby="captura-pendiente"
        >
          Capturar {operacion}
          <Icono nombre="flecha" size={16} />
        </button>
      </footer>
      <p id="captura-pendiente" className={estilos.nota}>
        Captura y procesamiento pendientes de integración.
      </p>
    </section>
  );
}

export default function CarrilPage() {
  const [sentido, setSentido] = useState<SentidoCarril>("ENTRADA");
  return (
    <div className="pagina">
      <Cabecera
        seccion="OPERACIÓN DEL PARQUEADERO"
        titulo="Control del carril"
        descripcion="Selecciona el sentido y prepara la lectura del vehículo."
      >
        <span className="estado-pendiente">Pendiente de integración</span>
      </Cabecera>
      <fieldset className={estilos.selector}>
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
        <LecturaCarril sentido={sentido} />
        <div className={estilos.lateral}>
          <section className={estilos.panel} aria-labelledby="titulo-barrera">
            <header className={estilos.encabezadoPanel}>
              <div>
                <span className={estilos.numero}>02 / PASO</span>
                <h2 id="titulo-barrera">Barrera del carril</h2>
              </div>
              <Icono nombre="carril" size={22} />
            </header>
            <p className={estilos.sinDatos}>Estado sin consultar</p>
            <p className={estilos.descripcion}>
              El estado y el motivo aparecerán al conectar el carril.
            </p>
          </section>
          <section className={estilos.panel} aria-labelledby="titulo-cupos">
            <header className={estilos.encabezadoPanel}>
              <div>
                <span className={estilos.numero}>03 / DISPONIBILIDAD</span>
                <h2 id="titulo-cupos">Cupos por tipo</h2>
              </div>
              <Icono nombre="carro" size={22} />
            </header>
            <dl className={estilos.cupos}>
              <div>
                <dt>Carros</dt>
                <dd>Sin consultar</dd>
              </div>
              <div>
                <dt>Motos</dt>
                <dd>Sin consultar</dd>
              </div>
            </dl>
            <p className={estilos.descripcion}>
              La ocupación y la capacidad aún no se han consultado.
            </p>
          </section>
        </div>
      </div>
      <section className={estilos.manual} aria-labelledby="titulo-manual">
        <div>
          <span className={estilos.numero}>04 / VALIDACIÓN</span>
          <h2 id="titulo-manual">Lectura manual</h2>
          <p className={estilos.descripcion}>
            Cuando una lectura requiera revisión, podrás validar o digitar la
            placa aquí.
          </p>
        </div>
        <div className={estilos.controlesManuales}>
          <label htmlFor="placa-manual">
            Placa del vehículo
            <input
              id="placa-manual"
              type="text"
              placeholder="ABC123 o ABC12A"
              disabled
              aria-describedby="manual-pendiente"
            />
          </label>
          <button
            type="button"
            className="boton-secundario"
            disabled
            aria-describedby="manual-pendiente"
          >
            Confirmar placa
          </button>
          <p id="manual-pendiente" className={estilos.nota}>
            Validación manual pendiente de integración.
          </p>
        </div>
      </section>
    </div>
  );
}

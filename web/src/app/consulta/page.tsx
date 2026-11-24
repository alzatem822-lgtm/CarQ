"use client";

import { useState } from "react";
import { Cabecera } from "@/componentes/Cabecera";
import estilos from "./Consulta.module.css";

const vistas = ["Eventos", "Cobros"] as const;
type Vista = (typeof vistas)[number];

export default function ConsultaPage() {
  const [vista, setVista] = useState<Vista>("Eventos");

  return (
    <div className="pagina">
      <Cabecera
        titulo="Consulta"
        descripcion="Revisa los ingresos, las salidas y los cobros de tu sede."
      />
      <div className={estilos.panel}>
        <div className={estilos.vistas} role="group" aria-label="Tipo de registro">
          {vistas.map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={vista === opcion}
              aria-controls="resultados-consulta"
              onClick={() => setVista(opcion)}
            >
              {opcion}
            </button>
          ))}
        </div>
        <section id="resultados-consulta" className={estilos.contenido} aria-label={vista}>
          <h2>{vista}</h2>
        </section>
      </div>
    </div>
  );
}

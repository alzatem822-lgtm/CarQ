"use client";

import { useState } from "react";
import { Cabecera } from "@/componentes/Cabecera";
import { Icono } from "@/componentes/Icono";
import {
  FormularioConfiguracion,
  type RecursoConfiguracion,
} from "@/componentes/administracion/FormularioConfiguracion";
import { SeccionAnulacion } from "@/componentes/administracion/SeccionAnulacion";

type Seccion = RecursoConfiguracion | "anulacion";

const opciones: {
  clave: Seccion;
  titulo: string;
  icono: string;
  descripcion: string;
}[] = [
  {
    clave: "tarifas",
    titulo: "Tarifas",
    icono: "caja",
    descripcion: "Valores de cobro por tipo de vehículo y franja horaria.",
  },
  {
    clave: "franja",
    titulo: "Franja diurna",
    icono: "reloj",
    descripcion: "Establece las horas que delimitan el horario diurno.",
  },
  {
    clave: "cupos",
    titulo: "Capacidad por tipo",
    icono: "carro",
    descripcion: "Máximo de vehículos admitidos para cada tipo.",
  },
  {
    clave: "umbral",
    titulo: "Confianza de lectura",
    icono: "escudo",
    descripcion: "Configura el umbral que utilizará la validación de lecturas.",
  },
  {
    clave: "anulacion",
    titulo: "Anulación de cobros",
    icono: "caja",
    descripcion:
      "Busca por placa y anula un cobro pendiente indicando el motivo.",
  },
];

export default function AdministracionPage() {
  const [actual, setActual] = useState<Seccion>("tarifas");
  const [modificado, setModificado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const opcion = opciones.find(({ clave }) => clave === actual)!;
  const esAnulacion = actual === "anulacion";

  function cambiarSeccion(seccion: Seccion) {
    if (guardando || actual === seccion) return;
    if (
      modificado &&
      !window.confirm(
        "Se descartarán los cambios sin guardar. ¿Cambiar de sección?",
      )
    )
      return;
    setActual(seccion);
    setModificado(false);
  }

  return (
    <div className="pagina">
      <Cabecera
        seccion="ADMINISTRACIÓN"
        titulo="Una sede, tus reglas."
        descripcion="Consulta y ajusta la configuración de tu parqueadero."
      >
        <span className="etiqueta-oro">ACCESO ADMINISTRADOR</span>
      </Cabecera>
      <div className="config-grid">
        <div>
          <nav className="config-menu" aria-label="Secciones de configuración">
            {opciones.map(({ clave, icono, titulo }) => (
              <button
                key={clave}
                disabled={guardando}
                aria-current={actual === clave ? "true" : undefined}
                onClick={() => cambiarSeccion(clave)}
              >
                <Icono nombre={icono} size={18} />
                {titulo}
              </button>
            ))}
          </nav>
          {!esAnulacion && (
            <p className="config-ayuda">
              Los cambios se aplican al guardarlos. Vuelve a cargar una sección
              para comprobar sus valores persistidos.
            </p>
          )}
        </div>
        <div>
          <section className="panel-config">
            <header className="panel-config-header">
              <div>
                <h2>{opcion.titulo}</h2>
                <p>{opcion.descripcion}</p>
              </div>
              {!esAnulacion && (
                <span className="estado-disponible">Configuración</span>
              )}
            </header>
            <div className="panel-config-body">
              {esAnulacion ? (
                <SeccionAnulacion
                  onDirtyChange={setModificado}
                  onSavingChange={setGuardando}
                />
              ) : (
                <FormularioConfiguracion
                  key={actual}
                  recurso={actual}
                  onDirtyChange={setModificado}
                  onSavingChange={setGuardando}
                />
              )}
            </div>
          </section>
          {!esAnulacion && (
            <div className="panel-contexto">
              <Icono nombre="escudo" />
              <div>
                <strong>Comprueba el recorrido completo</strong>
                <p>
                  Edita un valor, guarda y pulsa «Volver a cargar». También
                  puedes cerrar sesión y volver a entrar para verificar la
                  configuración.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

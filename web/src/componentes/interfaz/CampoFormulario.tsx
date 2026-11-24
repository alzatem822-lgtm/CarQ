import { useId, type InputHTMLAttributes } from "react";
import estilos from "./CampoFormulario.module.css";

interface CampoFormularioProps extends InputHTMLAttributes<HTMLInputElement> {
  etiqueta: string;
  error?: string;
}

export function CampoFormulario({
  etiqueta,
  error,
  ...resto
}: CampoFormularioProps) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div className={estilos.campo}>
      <label htmlFor={id} className={estilos.etiqueta}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={`${estilos.entrada} ${error ? estilos.entradaError : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        {...resto}
      />
      {error && (
        <span id={idError} className={estilos.mensajeError}>
          {error}
        </span>
      )}
    </div>
  );
}
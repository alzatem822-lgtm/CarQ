import type { ReactNode } from "react";
import estilos from "./Tabla.module.css";

export interface Columna<T> {
  encabezado: string;
  celda: (fila: T) => ReactNode;
}

interface TablaProps<T> {
  columnas: Columna<T>[];
  filas: T[];
  clave: (fila: T) => string | number;
  mensajeVacio?: string;
}

export function Tabla<T>({
  columnas,
  filas,
  clave,
  mensajeVacio = "Sin datos",
}: TablaProps<T>) {
  return (
    <table className={estilos.tabla}>
      <thead>
        <tr>
          {columnas.map((c) => (
            <th key={c.encabezado} className={estilos.encabezado}>
              {c.encabezado}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.length === 0 ? (
          <tr>
            <td colSpan={columnas.length} className={estilos.vacia}>
              {mensajeVacio}
            </td>
          </tr>
        ) : (
          filas.map((fila) => (
            <tr key={clave(fila)}>
              {columnas.map((c) => (
                <td key={c.encabezado} className={estilos.celda}>
                  {c.celda(fila)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
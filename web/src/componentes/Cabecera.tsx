import type { ReactNode } from 'react';
export function Cabecera({ titulo, descripcion, seccion = 'TU ESPACIO DE TRABAJO', children }: { titulo: string; descripcion: string; seccion?: string; children?: ReactNode }) {
  return <header className="cabecera"><div><span className="eyebrow">{seccion}</span><h1>{titulo}</h1><p>{descripcion}</p></div>{children}</header>;
}

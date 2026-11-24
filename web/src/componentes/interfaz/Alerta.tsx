import type { ReactNode } from 'react';
import type { Tono } from './estados';
import estilos from './Alerta.module.css';

interface PropiedadesAlerta {
  tono?: Tono;
  children: ReactNode;
}

export function Alerta({ tono = 'informacion', children }: PropiedadesAlerta) {
  return (
    <div role="alert" className={`${estilos.alerta} ${estilos[tono]}`}>
      {children}
    </div>
  );
}
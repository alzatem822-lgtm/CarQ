import { ESTADOS, type ClaveEstado } from './estados';
import estilos from './InsigniaEstado.module.css';

interface PropiedadesInsigniaEstado {
  estado: ClaveEstado;
}

export function InsigniaEstado({ estado }: PropiedadesInsigniaEstado) {
  const { texto, tono } = ESTADOS[estado];

  return (
    <span className={`${estilos.insignia} ${estilos[tono]}`}>{texto}</span>
  );
}
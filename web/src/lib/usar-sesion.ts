import { useMemo, useSyncExternalStore } from 'react';
import {
  leerSesionCruda,
  limpiarSesion,
  parsearSesion,
  suscribirSesion,
  type Sesion,
} from './sesion';

export interface EstadoSesion {
  readonly sesion: Sesion | null;
  readonly cargando: boolean;
  cerrarSesion(): void;
}

export function useSesion(): EstadoSesion {
  // En el servidor la sesión es desconocida (undefined): eso es "cargando".
  const cruda = useSyncExternalStore<string | null | undefined>(
    suscribirSesion,
    leerSesionCruda,
    () => undefined,
  );

  return useMemo(
    () => ({
      sesion: cruda ? parsearSesion(cruda) : null,
      cargando: cruda === undefined,
      cerrarSesion: limpiarSesion,
    }),
    [cruda],
  );
}
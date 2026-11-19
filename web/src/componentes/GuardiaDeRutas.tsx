'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { RUTA_INICIAL, verificarSesion } from '@/lib/autenticacion';
import { ErrorApi } from '@/lib/cliente-http';
import { esRutaProtegida, puedeAcceder } from '@/lib/permisos';
import type { Sesion } from '@/lib/sesion';
import { useSesion } from '@/lib/usar-sesion';

interface Validacion {
  sesion: Sesion;
  ruta: string;
  intento: number;
  estado: 'validada' | 'error';
}

export function GuardiaDeRutas({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const { sesion, cargando, cerrarSesion } = useSesion();
  const [intento, setIntento] = useState(0);
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const protegida = esRutaProtegida(ruta);
  const actual =
    validacion?.sesion === sesion &&
    validacion.ruta === ruta &&
    validacion.intento === intento
      ? validacion.estado
      : null;

  useEffect(() => {
    if (!protegida || cargando) return;
    if (!sesion) {
      router.replace('/login');
      return;
    }

    const control = new AbortController();
    verificarSesion(control.signal)
      .then(({ rol }) => {
        if (control.signal.aborted) return;
        if (rol !== sesion.rol) {
          cerrarSesion();
          return;
        }
        if (!puedeAcceder(rol, ruta)) router.replace(RUTA_INICIAL[rol]);
        setValidacion({ sesion, ruta, intento, estado: 'validada' });
      })
      .catch((error: unknown) => {
        if (control.signal.aborted || (error instanceof ErrorApi && error.estado === 401)) return;
        setValidacion({ sesion, ruta, intento, estado: 'error' });
      });
    return () => control.abort();
  }, [cargando, cerrarSesion, intento, protegida, router, ruta, sesion]);

  if (!protegida) return <>{children}</>;
  if (actual === 'error') {
    return (
      <main className="carga-pagina">
        <div className="error-carga">
          <Alerta tono="peligro">No pudimos verificar tu sesión.</Alerta>
          <button className="boton-secundario" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      </main>
    );
  }
  if (cargando || (sesion && actual === null)) {
    return (
      <main className="carga-pagina" role="status">
        Preparando tu espacio de trabajo…
      </main>
    );
  }
  if (actual !== 'validada' || !sesion || !puedeAcceder(sesion.rol, ruta)) return null;
  return <>{children}</>;
}

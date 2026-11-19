'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { RUTA_INICIAL } from '@/lib/autenticacion';
import { puedeAcceder } from '@/lib/permisos';
import { useSesion } from '@/lib/usar-sesion';

export function GuardiaDeRutas({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const { sesion, cargando } = useSesion();
  const permitido = puedeAcceder(sesion?.rol ?? null, ruta);

  useEffect(() => {
    if (cargando || permitido) return;
    // Sin sesión se va al login; con sesión pero sin permiso, a su pantalla de inicio.
    router.replace(sesion ? RUTA_INICIAL[sesion.rol] : '/login');
  }, [cargando, permitido, sesion, router]);

  if (cargando && ruta !== '/login') return <div className="carga-pagina" role="status">Preparando tu espacio de trabajo…</div>;
  if (!permitido) return null;
  return <>{children}</>;
}

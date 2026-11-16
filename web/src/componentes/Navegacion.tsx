'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { enlacesPara } from '@/lib/permisos';
import { useSesion } from '@/lib/usar-sesion';

export function Navegacion() {
  const router = useRouter();
  const { sesion, cargando, cerrarSesion } = useSesion();

  function alCerrarSesion() {
    cerrarSesion();
    router.replace('/login');
  }

  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
      {!cargando && !sesion && <Link href="/login">Login</Link>}
      {sesion &&
        enlacesPara(sesion.rol).map((enlace) => (
          <Link key={enlace.ruta} href={enlace.ruta}>
            {enlace.texto}
          </Link>
        ))}
      {sesion && (
        <button type="button" onClick={alCerrarSesion}>
          Cerrar sesión
        </button>
      )}
    </nav>
  );
}
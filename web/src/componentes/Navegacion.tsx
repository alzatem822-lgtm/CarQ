'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { enlacesPara } from '@/lib/permisos';
import { useSesion } from '@/lib/usar-sesion';
import { Icono } from './Icono';
const iconos: Record<string, string> = { '/inicio': 'panel', '/administracion': 'ajustes', '/carril': 'carril', '/caja': 'caja', '/consulta': 'consulta' };
export function Navegacion() {
  const ruta = usePathname();
  const router = useRouter();
  const { sesion, cargando, cerrarSesion } = useSesion();
  if (ruta === '/login' || cargando || !sesion) return null;
  return <aside className="sidebar">
    <Link href="/inicio" className="marca" aria-label="CarQ, inicio"><span className="marca-icono">Q</span><span>Car<span className="dorado">Q</span><small>PARKING MANAGEMENT</small></span></Link>
    <div className="sidebar-label">ESPACIO DE TRABAJO</div>
    <nav aria-label="Navegación principal">{enlacesPara(sesion.rol).map(enlace => <Link key={enlace.ruta} href={enlace.ruta} className={`nav-enlace ${ruta === enlace.ruta ? 'activo' : ''}`} aria-current={ruta === enlace.ruta ? 'page' : undefined}><Icono nombre={iconos[enlace.ruta]} />{enlace.texto}{ruta === enlace.ruta && <span className="nav-punto" />}</Link>)}</nav>
    <div className="sidebar-bottom"><div className="perfil"><span className="avatar">{sesion.rol === 'ADMINISTRADOR' ? 'AD' : 'OP'}</span><div><strong>{sesion.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Operador'}</strong><small>Sesión de trabajo</small></div></div><button className="boton-salir" onClick={() => { cerrarSesion(); router.replace('/login'); }}><Icono nombre="salir" /> Cerrar sesión</button><small className="sidebar-pie">CarQ · Control con precisión.</small></div>
  </aside>;
}

import Link from 'next/link';
import { Cabecera } from './Cabecera';
import { Icono } from './Icono';
export function PantallaPendiente({ titulo, descripcion, icono, pasos }: { titulo: string; descripcion: string; icono: string; pasos: string[] }) {
  return <div className="pagina"><Cabecera titulo={titulo} descripcion={descripcion} seccion="OPERACIÓN DEL PARQUEADERO" /><div className="pendiente-layout"><section className="pendiente-principal"><div className="icono-caja"><Icono nombre={icono} size={28} /></div><span className="estado-pendiente">Pendiente de integración</span><h2>Este flujo todavía no está disponible.</h2><p>La pantalla está preparada para continuar el desarrollo. Aún no registra operaciones ni muestra resultados del parqueadero.</p><Link href="/inicio" className="boton-secundario">Volver a la vista general<Icono nombre="flecha" size={16} /></Link></section><section className="pendiente-detalle"><h3>El recorrido previsto</h3><ol>{pasos.map(paso => <li key={paso}>{paso}</li>)}</ol></section></div></div>;
}

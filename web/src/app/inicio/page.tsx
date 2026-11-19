'use client';
import Link from 'next/link';
import { Cabecera } from '@/componentes/Cabecera';
import { Icono } from '@/componentes/Icono';
import { useSesion } from '@/lib/usar-sesion';
export default function InicioPage() {
  const { sesion } = useSesion();
  const admin = sesion?.rol === 'ADMINISTRADOR';
  const tarjetas = admin ? [
    { icono: 'ajustes', titulo: 'Configura la sede', texto: 'Tarifas, franja diurna, cupos y umbral conectados al servicio.', enlace: '/administracion', accion: 'Abrir configuración', disponible: true },
    { icono: 'escudo', titulo: 'Comprueba los cambios', texto: 'Guarda un valor y vuelve a cargarlo para comprobar lo persistido.', enlace: '/administracion', accion: 'Probar configuración', disponible: true },
    { icono: 'consulta', titulo: 'Consulta de cobros', texto: 'La búsqueda de cobros estará disponible al integrar su servicio.', enlace: '/consulta', accion: 'Ver pantalla', disponible: false },
  ] : [
    { icono: 'carril', titulo: 'Control del carril', texto: 'Espacio reservado para lectura de placas, ingresos y salidas.', enlace: '/carril', accion: 'Ver pantalla', disponible: false },
    { icono: 'caja', titulo: 'Atención en caja', texto: 'Busca cobros pendientes por placa y registra pagos en efectivo.', enlace: '/caja', accion: 'Abrir Caja', disponible: true },
    { icono: 'consulta', titulo: 'Consulta de cobros', texto: 'Consulta el alcance de la próxima integración de búsquedas.', enlace: '/consulta', accion: 'Ver pantalla', disponible: false },
  ];
  return <div className="pagina"><Cabecera titulo="Todo comienza con un buen control." descripcion="Tu configuración y tus herramientas, en un mismo espacio." /><section className="hero-panel"><div><span className="etiqueta-oro">{admin ? 'ADMINISTRACIÓN' : 'OPERACIÓN'}</span><h2>{admin ? 'Prepara tu sede para cada jornada.' : 'Tu punto de partida para la jornada.'}</h2><p>{admin ? 'Define tarifas, horarios, capacidad y confianza de lectura. Consulta los valores actuales y guarda cada cambio desde Administración.' : 'Explora las pantallas del carril y de caja. Los flujos de ingreso, salida y pago están pendientes de integración.'}</p><Link className="boton-primario" href={admin ? '/administracion' : '/carril'}>{admin ? 'Configurar mi sede' : 'Ir al carril'}<Icono nombre="flecha" size={18} /></Link></div><div className="hero-grafico" aria-hidden="true"><div className="parking-p">P</div><div className="parking-lineas" /><span>CARQ / CONTROL DE ACCESO</span></div></section><div className="titulo-seccion"><h2>Tu recorrido de trabajo</h2><span>Acceso según tu perfil</span></div><div className="tarjetas-recorrido">{tarjetas.map((item, index) => <article className="tarjeta-recorrido" key={item.titulo}><div className="recorrido-top"><Icono nombre={item.icono} size={26} /><span>0{index + 1}</span></div><span className={item.disponible ? 'estado-disponible' : 'estado-pendiente'}>{item.disponible ? 'Disponible' : 'Pendiente de integración'}</span><h3>{item.titulo}</h3><p>{item.texto}</p><Link href={item.enlace}>{item.accion}<Icono nombre="flecha" size={16} /></Link></article>)}</div><div className="nota-inferior"><Icono nombre="escudo" /><p>Las acciones disponibles respetan los permisos de tu rol. Cierra sesión para cambiar de perfil.</p></div></div>;
}

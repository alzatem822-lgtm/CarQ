'use client';
import { useState } from 'react';
import { Cabecera } from '@/componentes/Cabecera';
import { Icono } from '@/componentes/Icono';
import { FormularioConfiguracion, type RecursoConfiguracion } from '@/componentes/administracion/FormularioConfiguracion';
const opciones: { clave: RecursoConfiguracion; titulo: string; icono: string; descripcion: string }[] = [
  { clave: 'tarifas', titulo: 'Tarifas', icono: 'caja', descripcion: 'Valores de cobro por tipo de vehículo y franja horaria.' },
  { clave: 'franja', titulo: 'Franja diurna', icono: 'reloj', descripcion: 'Establece las horas que delimitan el horario diurno.' },
  { clave: 'cupos', titulo: 'Capacidad por tipo', icono: 'carro', descripcion: 'Máximo de vehículos admitidos para cada tipo.' },
  { clave: 'umbral', titulo: 'Confianza de lectura', icono: 'escudo', descripcion: 'Configura el umbral que utilizará la validación de lecturas.' },
];
export default function AdministracionPage() {
  const [actual, setActual] = useState<RecursoConfiguracion>('tarifas');
  const [modificado, setModificado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const opcion = opciones.find(o => o.clave === actual)!;
  return <div className="pagina"><Cabecera seccion="ADMINISTRACIÓN" titulo="Una sede, tus reglas." descripcion="Consulta y ajusta la configuración de tu parqueadero." ><span className="etiqueta-oro">ACCESO ADMINISTRADOR</span></Cabecera><div className="config-grid"><div><nav className="config-menu" aria-label="Secciones de configuración">{opciones.map(o => <button key={o.clave} disabled={guardando} aria-current={actual === o.clave ? 'true' : undefined} onClick={() => { if (!guardando && actual !== o.clave && (!modificado || window.confirm('Se descartarán los cambios sin guardar. ¿Cambiar de sección?'))) { setActual(o.clave); setModificado(false); } }}><Icono nombre={o.icono} size={18} />{o.titulo}</button>)}</nav><p className="config-ayuda">Los cambios se aplican al guardarlos. Vuelve a cargar una sección para comprobar sus valores persistidos.</p></div><div><section className="panel-config"><header className="panel-config-header"><div><h2>{opcion.titulo}</h2><p>{opcion.descripcion}</p></div><span className="estado-disponible">Configuración</span></header><div className="panel-config-body"><FormularioConfiguracion key={actual} recurso={actual} onDirtyChange={setModificado} onSavingChange={setGuardando} /></div></section><div className="panel-contexto"><Icono nombre="escudo" /><div><strong>Comprueba el recorrido completo</strong><p>Edita un valor, guarda y pulsa «Volver a cargar». También puedes cerrar sesión y volver a entrar para verificar la configuración.</p></div></div></div></div></div>;
}

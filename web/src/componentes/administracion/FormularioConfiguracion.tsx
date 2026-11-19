'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { consultarCupos, consultarTarifas, consultarUmbral, guardarCupos, guardarFranja, guardarTarifas, guardarUmbral } from '@/lib/configuracion';
import { mensajeDeErrorApi } from '@/lib/mensaje-error-api';

export type RecursoConfiguracion = 'tarifas' | 'franja' | 'cupos' | 'umbral';
type Valores = Record<string, string>;
const tipos = ['CARRO', 'MOTO'] as const;
const franjas = ['DIURNA', 'NOCTURNA'] as const;

async function cargarValores(recurso: RecursoConfiguracion): Promise<Valores> {
  if (recurso === 'cupos') return Object.fromEntries((await consultarCupos()).cupos.map(c => [c.tipoVehiculo, String(c.maximo)]));
  if (recurso === 'umbral') return { umbral: String((await consultarUmbral()).umbral) };
  const datos = await consultarTarifas();
  if (recurso === 'franja') return { inicioHora: String(datos.franja.inicioHora), finHora: String(datos.franja.finHora) };
  return Object.fromEntries(datos.tarifas.map(t => [`${t.tipoVehiculo}_${t.franja}`, String(t.valor)]));
}

async function persistir(recurso: RecursoConfiguracion, valores: Valores): Promise<Valores> {
  if (Object.values(valores).some(v => !v.trim() || !Number.isFinite(Number(v)))) throw new Error('Completa todos los campos con valores numéricos.');
  if (recurso === 'cupos') {
    const datos = await guardarCupos(Object.entries(valores).map(([tipoVehiculo, maximo]) => ({ tipoVehiculo, maximo: Number(maximo) })));
    return Object.fromEntries(datos.cupos.map(c => [c.tipoVehiculo, String(c.maximo)]));
  }
  if (recurso === 'umbral') return { umbral: String((await guardarUmbral(Number(valores.umbral))).umbral) };
  if (recurso === 'franja') {
    if (Number(valores.inicioHora) >= Number(valores.finHora)) throw new Error('La hora de inicio debe ser menor que la hora de fin.');
    const datos = await guardarFranja({ inicioHora: Number(valores.inicioHora), finHora: Number(valores.finHora) });
    return { inicioHora: String(datos.inicioHora), finHora: String(datos.finHora) };
  }
  for (const tipo of tipos) {
    const dia = Number(valores[`${tipo}_DIURNA`]);
    const noche = Number(valores[`${tipo}_NOCTURNA`]);
    if (!(dia === 0 && noche === 0) && noche >= dia) throw new Error(`La tarifa nocturna de ${tipo === 'CARRO' ? 'carro' : 'moto'} debe ser menor que la diurna.`);
  }
  const datos = await guardarTarifas(tipos.flatMap(tipoVehiculo => franjas.map(franja => ({ tipoVehiculo, franja, valor: Number(valores[`${tipoVehiculo}_${franja}`]) }))));
  return Object.fromEntries(datos.tarifas.map(t => [`${t.tipoVehiculo}_${t.franja}`, String(t.valor)]));
}

export function FormularioConfiguracion({ recurso, onDirtyChange }: { recurso: RecursoConfiguracion; onDirtyChange?: (dirty: boolean) => void }) {
  const [valores, setValores] = useState<Valores | null>(null);
  const [original, setOriginal] = useState<Valores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'guardando'>('cargando');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const sucio = JSON.stringify(valores) !== JSON.stringify(original);
  useEffect(() => { onDirtyChange?.(sucio); }, [sucio, onDirtyChange]);
  useEffect(() => {
    let activo = true;
    cargarValores(recurso).then(datos => { if (activo) { setValores(datos); setOriginal(datos); setMensaje(null); } }).catch(e => { if (activo) setError(mensajeDeErrorApi(e, 'No pudimos cargar esta configuración. Comprueba la conexión y vuelve a intentar.')); }).finally(() => { if (activo) setEstado('listo'); });
    return () => { activo = false; };
  }, [recurso, intento]);
  function recargar() { setError(null); setMensaje(null); setEstado('cargando'); setIntento(i => i + 1); }
  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!valores || estado !== 'listo') return;
    setEstado('guardando'); setError(null); setMensaje(null);
    try { const datos = await persistir(recurso, valores); setValores(datos); setOriginal(datos); setMensaje('Cambios guardados. Puedes volver a cargar para comprobar los valores del servicio.'); }
    catch (e) { setError(mensajeDeErrorApi(e, e instanceof Error && !(e.name === 'ErrorApi') && !(e instanceof TypeError) ? e.message : 'No pudimos guardar. Tu edición se conserva para que puedas reintentar.')); }
    finally { setEstado('listo'); }
  }
  if (estado === 'cargando') return <div className="carga-panel" role="status">Consultando configuración…</div>;
  if (!valores) return <div className="error-carga"><Alerta tono="peligro">{error ?? 'No hay configuración disponible.'}</Alerta><button className="boton-secundario" onClick={recargar}>Reintentar conexión</button></div>;
  const campo = (clave: string, etiqueta: string, min = 0, max = 2147483647, step = 1) => <CampoFormulario key={clave} etiqueta={etiqueta} name={clave} type="number" min={min} max={max} step={step} value={valores[clave] ?? ''} required onChange={e => { setValores(v => ({ ...v, [clave]: e.target.value })); setMensaje(null); setError(null); }} />;
  return <form className="form-config" onSubmit={guardar} aria-busy={estado === 'guardando'}>
    {error && <Alerta tono="peligro">{error}</Alerta>}{mensaje && <Alerta tono="exito">{mensaje}</Alerta>}
    <fieldset disabled={estado === 'guardando'}><div className="form-campos">
      {recurso === 'tarifas' && tipos.map(tipo => <div className="form-grupo" key={tipo}><h3>{tipo === 'CARRO' ? 'Carros' : 'Motos'} · COP</h3>{franjas.map(f => campo(`${tipo}_${f}`, f === 'DIURNA' ? 'Tarifa diurna' : 'Tarifa nocturna'))}</div>)}
      {recurso === 'cupos' && tipos.map(tipo => campo(tipo, tipo === 'CARRO' ? 'Capacidad de carros' : 'Capacidad de motos'))}
      {recurso === 'franja' && <>{campo('inicioHora', 'Inicio diurno · hora (0–23)', 0, 23)}{campo('finHora', 'Fin diurno · hora (1–24)', 1, 24)}</>}
      {recurso === 'umbral' && campo('umbral', 'Umbral de confianza (0–1)', 0, 1, 0.01)}
    </div></fieldset>
    <p className="form-nota">{recurso === 'tarifas' ? 'La tarifa nocturna debe ser menor que la diurna. Ambos valores en 0 indican gratuidad, según la configuración acordada para el proyecto.' : recurso === 'franja' ? 'El inicio está incluido y el fin excluido. Por ejemplo, de 6 a 18: la franja diurna empieza a las 06:00 y termina al llegar a las 18:00. La nocturna cubre el resto del día.' : recurso === 'cupos' ? 'Define el máximo admitido por tipo. Estos valores representan capacidad configurada, no la ocupación actual del parqueadero.' : 'Una lectura por debajo de este valor requiere validación. La configuración se guarda con precisión de dos decimales.'}</p>
    <div className="form-acciones"><span>{sucio ? 'Tienes cambios sin guardar' : 'Configuración cargada del servicio'}</span><div className="form-botones"><button type="button" className="boton-secundario" disabled={estado === 'guardando'} onClick={() => { if (!sucio || window.confirm('Se descartarán los cambios sin guardar. ¿Volver a cargar?')) recargar(); }}>Volver a cargar</button><button className="boton-primario" type="submit" disabled={estado === 'guardando' || !sucio}>{estado === 'guardando' ? 'Guardando…' : 'Guardar cambios'}</button></div></div>
  </form>;
}

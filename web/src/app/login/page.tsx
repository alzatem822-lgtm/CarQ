'use client';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { Icono } from '@/componentes/Icono';
import { iniciarSesion, RUTA_INICIAL } from '@/lib/autenticacion';
import { ErrorApi } from '@/lib/cliente-http';
import { guardarSesion } from '@/lib/sesion';
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [visible, setVisible] = useState(false);
  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (enviando) return;
    const datos = new FormData(evento.currentTarget);
    setError(null); setEnviando(true);
    try {
      const sesion = await iniciarSesion(String(datos.get('nombre')).trim(), String(datos.get('contrasena')));
      guardarSesion(sesion); router.replace(RUTA_INICIAL[sesion.rol]);
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 401 ? 'Usuario o contraseña incorrectos.' : 'No pudimos conectar con el servicio. Comprueba que la API esté disponible e intenta de nuevo.');
      setEnviando(false);
    }
  }
  return <div className="login-layout">
    <section className="login-presentacion"><div className="marca"><span className="marca-icono">Q</span><span>Car<span className="dorado">Q</span><small>PARKING MANAGEMENT</small></span></div><div className="login-titular"><span className="eyebrow">CADA ACCESO CUENTA</span><h1>El control de tu<br />parqueadero.<br /><span>En un solo lugar.</span></h1><p>Un espacio para administrar la configuración y acompañar la operación de tu sede.</p><div className="login-trazo"><span /><Icono nombre="carro" size={62} /><span /></div></div><footer>Precisión en el acceso. Claridad en la gestión.</footer></section>
    <section className="login-acceso"><form className="login-form" onSubmit={alEnviar} aria-busy={enviando}><div className="icono-caja"><Icono nombre="llave" size={25} /></div><span className="eyebrow">BIENVENIDO A CARQ</span><h2>Inicia tu sesión</h2><p className="texto-suave">Ingresa con la cuenta asignada a tu rol.</p>{error && <Alerta tono="peligro">{error}</Alerta>}<fieldset disabled={enviando}><CampoFormulario etiqueta="Usuario" name="nombre" autoComplete="username" placeholder="Tu nombre de usuario" required /><div className="password-label"><CampoFormulario etiqueta="Contraseña" name="contrasena" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Tu contraseña" required /><button type="button" className="mostrar-password" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></div></fieldset><button className="boton-primario login-submit" type="submit" disabled={enviando}>{enviando ? 'Iniciando sesión…' : 'Ingresar a mi espacio'}<Icono nombre="flecha" size={18} /></button><div className="login-seguridad"><Icono nombre="escudo" size={16} /><span>Acceso según tu perfil de administrador u operador.</span></div></form><span className="login-copyright">CarQ · Sistema de gestión de parqueadero</span></section>
  </div>;
}

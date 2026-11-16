'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { iniciarSesion, RUTA_INICIAL } from '@/lib/autenticacion';
import { ErrorApi } from '@/lib/cliente-http';
import { guardarSesion } from '@/lib/sesion';

function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi && error.estado === 401) {
    return 'Usuario o contraseña incorrectos.';
  }
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setError(null);
    setEnviando(true);
    try {
      const sesion = await iniciarSesion(
        String(datos.get('nombre')),
        String(datos.get('contrasena')),
      );
      guardarSesion(sesion);
      router.replace(RUTA_INICIAL[sesion.rol]);
    } catch (e) {
      setError(mensajeDeError(e));
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={alEnviar}>
      <h1>Login</h1>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      <CampoFormulario
        etiqueta="Usuario"
        name="nombre"
        autoComplete="username"
        required
      />
      <CampoFormulario
        etiqueta="Contraseña"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}
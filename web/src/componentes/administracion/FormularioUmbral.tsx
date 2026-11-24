'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { consultarUmbral, guardarUmbral } from '@/lib/configuracion';
import { mensajeDeErrorApi } from '@/lib/mensaje-error-api';

export function FormularioUmbral() {
  const [umbral, setUmbral] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const respuesta = await consultarUmbral();
        if (activo) setUmbral(String(respuesta.umbral));
      } catch (e) {
        if (activo) {
          setError(
            mensajeDeErrorApi(e, 'No se pudo cargar el umbral de confianza.'),
          );
        }
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  function alCambiar(valor: string) {
    setGuardado(false);
    setUmbral(valor);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (umbral === null) return;
    setError(null);
    setGuardado(false);
    setEnviando(true);
    try {
      const respuesta = await guardarUmbral(Number(umbral));
      setUmbral(String(respuesta.umbral));
      setGuardado(true);
    } catch (e) {
      setError(
        mensajeDeErrorApi(e, 'No se pudo guardar el umbral de confianza.'),
      );
    } finally {
      setEnviando(false);
    }
  }

  if (umbral === null) {
    return error ? (
      <Alerta tono="peligro">{error}</Alerta>
    ) : (
      <p>Cargando umbral de confianza...</p>
    );
  }

  return (
    <form onSubmit={alEnviar}>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      {guardado && <Alerta tono="exito">Umbral de confianza guardado.</Alerta>}
      <CampoFormulario
        etiqueta="Umbral de confianza (entre 0 y 1)"
        name="umbral"
        type="number"
        min={0}
        max={1}
        step={0.01}
        value={umbral}
        onChange={(e) => alCambiar(e.target.value)}
        required
      />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando...' : 'Guardar umbral'}
      </button>
    </form>
  );
}
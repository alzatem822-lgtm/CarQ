'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { consultarCupos, guardarCupos } from '@/lib/configuracion';
import { mensajeDeErrorApi } from '@/lib/mensaje-error-api';

const ETIQUETAS: Record<string, string> = {
  CARRO: 'Máximo de carros',
  MOTO: 'Máximo de motos',
};

type Maximos = Record<string, string>;

function aTexto(cupos: { tipoVehiculo: string; maximo: number }[]): Maximos {
  return Object.fromEntries(
    cupos.map((c) => [c.tipoVehiculo, String(c.maximo)]),
  );
}

export function FormularioCupos() {
  const [maximos, setMaximos] = useState<Maximos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const respuesta = await consultarCupos();
        if (activo) setMaximos(aTexto(respuesta.cupos));
      } catch (e) {
        if (activo) {
          setError(mensajeDeErrorApi(e, 'No se pudieron cargar los cupos.'));
        }
      }
    }
    void cargar();
    return () => {
      activo = false;
    };
  }, []);

  function alCambiar(tipo: string, valor: string) {
    setGuardado(false);
    setMaximos((actuales) => ({ ...actuales, [tipo]: valor }));
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!maximos) return;
    setError(null);
    setGuardado(false);
    setEnviando(true);
    try {
      const respuesta = await guardarCupos(
        Object.entries(maximos).map(([tipoVehiculo, maximo]) => ({
          tipoVehiculo,
          maximo: Number(maximo),
        })),
      );
      setMaximos(aTexto(respuesta.cupos));
      setGuardado(true);
    } catch (e) {
      setError(mensajeDeErrorApi(e, 'No se pudieron guardar los cupos.'));
    } finally {
      setEnviando(false);
    }
  }

  if (!maximos) {
    return error ? (
      <Alerta tono="peligro">{error}</Alerta>
    ) : (
      <p>Cargando cupos...</p>
    );
  }

  return (
    <form onSubmit={alEnviar}>
      {error && <Alerta tono="peligro">{error}</Alerta>}
      {guardado && <Alerta tono="exito">Cupos guardados.</Alerta>}
      {Object.entries(maximos).map(([tipo, valor]) => (
        <CampoFormulario
          key={tipo}
          etiqueta={ETIQUETAS[tipo] ?? `Máximo de ${tipo.toLowerCase()}`}
          name={tipo}
          type="number"
          min={0}
          step={1}
          value={valor}
          onChange={(e) => alCambiar(tipo, e.target.value)}
          required
        />
      ))}
      <button type="submit" disabled={enviando}>
        {enviando ? 'Guardando...' : 'Guardar cupos'}
      </button>
    </form>
  );
}
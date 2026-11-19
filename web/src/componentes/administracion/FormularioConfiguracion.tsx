'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { Alerta } from '@/componentes/interfaz/Alerta';
import {
  consultarCupos,
  consultarTarifas,
  consultarUmbral,
  guardarCupos,
  guardarFranja,
  guardarTarifas,
  guardarUmbral,
  type Horario,
  type TarifaConfigurada,
} from '@/lib/configuracion';
import { mensajeDeErrorApi } from '@/lib/mensaje-error-api';

export type RecursoConfiguracion = 'tarifas' | 'franja' | 'cupos' | 'umbral';
type Valores = Record<string, string | undefined>;

const tipos = ['CARRO', 'MOTO'] as const;
const MAXIMO_TARIFA = 2147483647;

const notas: Record<RecursoConfiguracion, string> = {
  tarifas: 'La tarifa nocturna debe ser menor que la diurna. Ambos valores en 0 indican gratuidad.',
  franja: 'La hora de inicio está incluida y la hora de fin es exclusiva. De 06:00 a 18:00, la franja diurna cubre de 06:00 a 17:59.',
  cupos: 'Define el máximo admitido por tipo. Estos valores representan capacidad configurada, no la ocupación actual del parqueadero.',
  umbral: 'Una lectura por debajo de este valor requiere validación. La configuración se guarda con precisión de dos decimales.',
};

class ErrorValidacionConfiguracion extends Error {}

function valoresTarifas(tarifas: TarifaConfigurada[]): Valores {
  return Object.fromEntries(
    tarifas.map(({ tipoVehiculo, franja, valor }) => [`${tipoVehiculo}_${franja}`, String(valor)]),
  );
}

function leerEntero(valor: string | undefined, minimo: number, maximo: number): number | null {
  if (!valor || !/^\d+$/.test(valor)) return null;
  const numero = Number(valor);
  return numero >= minimo && numero <= maximo ? numero : null;
}

function tarifasParaGuardar(valores: Valores): TarifaConfigurada[] {
  return tipos.flatMap((tipoVehiculo): TarifaConfigurada[] => {
    const diurna = leerEntero(valores[`${tipoVehiculo}_DIURNA`], 0, MAXIMO_TARIFA);
    const nocturna = leerEntero(valores[`${tipoVehiculo}_NOCTURNA`], 0, MAXIMO_TARIFA);
    const tipo = tipoVehiculo === 'CARRO' ? 'carros' : 'motos';

    if (diurna === null || nocturna === null) {
      throw new ErrorValidacionConfiguracion(
        `Ingresa las tarifas diurna y nocturna de ${tipo} como números enteros entre 0 y 2.147.483.647 COP.`,
      );
    }
    if (nocturna >= diurna && (diurna !== 0 || nocturna !== 0)) {
      throw new ErrorValidacionConfiguracion(
        `La tarifa nocturna de ${tipo} debe ser menor que la diurna.`,
      );
    }

    return [
      { tipoVehiculo, franja: 'DIURNA', valor: diurna },
      { tipoVehiculo, franja: 'NOCTURNA', valor: nocturna },
    ];
  });
}

function valoresFranja({ inicioHora, finHora }: Horario): Valores {
  return { inicioHora: String(inicioHora), finHora: String(finHora) };
}

function horarioParaGuardar(valores: Valores): Horario {
  const inicioHora = leerEntero(valores.inicioHora, 0, 23);
  const finHora = leerEntero(valores.finHora, 1, 24);

  if (inicioHora === null) {
    throw new ErrorValidacionConfiguracion('Ingresa una hora de inicio entera entre 0 y 23.');
  }
  if (finHora === null) {
    throw new ErrorValidacionConfiguracion('Ingresa una hora de fin entera entre 1 y 24.');
  }
  if (inicioHora >= finHora) {
    throw new ErrorValidacionConfiguracion('La hora de inicio debe ser menor que la hora de fin.');
  }

  return { inicioHora, finHora };
}

async function cargarValores(recurso: RecursoConfiguracion): Promise<Valores> {
  if (recurso === 'cupos') {
    const { cupos } = await consultarCupos();
    return Object.fromEntries(cupos.map(({ tipoVehiculo, maximo }) => [tipoVehiculo, String(maximo)]));
  }
  if (recurso === 'umbral') return { umbral: String((await consultarUmbral()).umbral) };

  const datos = await consultarTarifas();
  if (recurso === 'franja') return valoresFranja(datos.franja);
  return valoresTarifas(datos.tarifas);
}

async function persistir(recurso: RecursoConfiguracion, valores: Valores, original: Valores): Promise<Valores> {
  if (recurso === 'tarifas') {
    const cambios = tarifasParaGuardar(valores).filter(({ tipoVehiculo, franja }) => {
      const clave = `${tipoVehiculo}_${franja}`;
      return valores[clave] !== original[clave];
    });
    if (cambios.length === 0) return original;
    const { tarifas } = await guardarTarifas(cambios);
    return valoresTarifas(tarifas);
  }
  if (recurso === 'franja') {
    return valoresFranja(await guardarFranja(horarioParaGuardar(valores)));
  }

  if (Object.values(valores).some((v) => !v?.trim() || !Number.isFinite(Number(v)))) {
    throw new ErrorValidacionConfiguracion('Completa todos los campos con valores numéricos.');
  }
  if (recurso === 'cupos') {
    const { cupos } = await guardarCupos(
      Object.entries(valores).map(([tipoVehiculo, maximo]) => ({ tipoVehiculo, maximo: Number(maximo) })),
    );
    return Object.fromEntries(cupos.map(({ tipoVehiculo, maximo }) => [tipoVehiculo, String(maximo)]));
  }
  return { umbral: String((await guardarUmbral(Number(valores.umbral))).umbral) };
}

interface PropsFormulario {
  recurso: RecursoConfiguracion;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}

export function FormularioConfiguracion({ recurso, onDirtyChange, onSavingChange }: PropsFormulario) {
  const [valores, setValores] = useState<Valores | null>(null);
  const [original, setOriginal] = useState<Valores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'guardando'>('cargando');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const enCurso = useRef(false);
  const sucio = JSON.stringify(valores) !== JSON.stringify(original);
  const guardando = estado === 'guardando';

  useEffect(() => { onDirtyChange?.(sucio); }, [sucio, onDirtyChange]);
  useEffect(() => {
    let activo = true;
    cargarValores(recurso)
      .then((datos) => {
        if (!activo) return;
        setValores(datos);
        setOriginal(datos);
        setMensaje(null);
      })
      .catch((error: unknown) => {
        if (activo) {
          setError(mensajeDeErrorApi(error, 'No pudimos cargar la configuración. Comprueba la conexión y reintenta.'));
        }
      })
      .finally(() => { if (activo) setEstado('listo'); });
    return () => { activo = false; };
  }, [recurso, intento]);

  function recargar() {
    if (enCurso.current) return;
    setError(null);
    setMensaje(null);
    setEstado('cargando');
    setIntento((i) => i + 1);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valores || !original || !sucio || estado !== 'listo' || enCurso.current) return;

    enCurso.current = true;
    onSavingChange?.(true);
    setEstado('guardando');
    setError(null);
    setMensaje(null);
    try {
      const datos = await persistir(recurso, valores, original);
      setValores(datos);
      setOriginal(datos);
      setMensaje('Cambios guardados.');
    } catch (error) {
      setError(
        error instanceof ErrorValidacionConfiguracion
          ? error.message
          : mensajeDeErrorApi(error, 'No pudimos guardar. Tu edición se conserva para que puedas reintentar.'),
      );
    } finally {
      enCurso.current = false;
      onSavingChange?.(false);
      setEstado('listo');
    }
  }

  if (estado === 'cargando') {
    return <div className="carga-panel" role="status">Consultando configuración…</div>;
  }
  if (!valores) {
    return (
      <div className="error-carga">
        <Alerta tono="peligro">{error ?? 'No hay configuración disponible.'}</Alerta>
        <button className="boton-secundario" onClick={recargar}>Reintentar conexión</button>
      </div>
    );
  }

  function campo(clave: string, etiqueta: string, min = 0, max = MAXIMO_TARIFA, step = 1) {
    return (
      <CampoFormulario
        etiqueta={etiqueta}
        name={clave}
        type="number"
        min={min}
        max={max}
        step={step}
        value={valores?.[clave] ?? ''}
        required
        onChange={(evento) => {
          const valor = evento.currentTarget.value;
          setValores((anteriores) => ({ ...anteriores, [clave]: valor }));
          setMensaje(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <form
      className="form-config"
      onSubmit={guardar}
      aria-busy={guardando}
      noValidate={recurso === 'tarifas' || recurso === 'franja'}
    >
      {error && <Alerta tono="peligro">{error}</Alerta>}
      {mensaje && <Alerta tono="exito">{mensaje}</Alerta>}
      <fieldset disabled={guardando}>
        <div className="form-campos">
          {recurso === 'tarifas' && tipos.map((tipo) => (
            <div className="form-grupo" key={tipo}>
              <h3>{tipo === 'CARRO' ? 'Carros' : 'Motos'} · COP</h3>
              {campo(`${tipo}_DIURNA`, 'Tarifa diurna')}
              {campo(`${tipo}_NOCTURNA`, 'Tarifa nocturna')}
            </div>
          ))}
          {recurso === 'cupos' && tipos.map((tipo) => (
            <div key={tipo}>{campo(tipo, tipo === 'CARRO' ? 'Capacidad de carros' : 'Capacidad de motos')}</div>
          ))}
          {recurso === 'franja' && (
            <>
              {campo('inicioHora', 'Inicio diurno · hora (0–23)', 0, 23)}
              {campo('finHora', 'Fin diurno · hora (1–24)', 1, 24)}
            </>
          )}
          {recurso === 'umbral' && campo('umbral', 'Umbral de confianza (0–1)', 0, 1, 0.01)}
        </div>
      </fieldset>
      <p className="form-nota">{notas[recurso]}</p>
      <div className="form-acciones">
        <span>{sucio ? 'Tienes cambios sin guardar' : 'Configuración cargada del servicio'}</span>
        <div className="form-botones">
          <button
            type="button"
            className="boton-secundario"
            disabled={guardando}
            onClick={() => {
              if (!sucio || window.confirm('Se descartarán los cambios sin guardar. ¿Volver a cargar?')) recargar();
            }}
          >
            Volver a cargar
          </button>
          <button className="boton-primario" type="submit" disabled={guardando || !sucio}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </form>
  );
}

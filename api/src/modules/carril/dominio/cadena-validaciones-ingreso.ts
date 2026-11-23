import type { LecturaPlaca } from '../../vehiculos/dominio/lectura-placa';
import { RequiereValidacionManual } from '../../vehiculos/dominio/requiere-validacion-manual';
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { Cupo } from '../../configuracion/dominio/cupo';

export interface ContextoValidacionIngreso {
  lectura: LecturaPlaca;
  umbral: UmbralConfianza;
  consultarCupo(): Promise<{ cupo: Cupo; ocupacion: number }>;
}

export interface RechazoIngreso {
  resultado: 'RECHAZADO' | 'REQUIERE_LECTURA_MANUAL';
  motivo: string;
}

export interface ValidacionIngreso {
  evaluar(contexto: ContextoValidacionIngreso): Promise<RechazoIngreso | null>;
}

/** Detiene la admisión en el primer eslabón que no se satisface. */
export class CadenaValidacionesIngreso {
  constructor(private readonly validaciones: readonly ValidacionIngreso[]) {}

  async evaluar(
    contexto: ContextoValidacionIngreso,
  ): Promise<RechazoIngreso | null> {
    for (const validacion of this.validaciones) {
      const rechazo = await validacion.evaluar(contexto);
      if (rechazo) return rechazo;
    }
    return null;
  }
}

export class ValidarLecturaIngreso implements ValidacionIngreso {
  evaluar(contexto: ContextoValidacionIngreso): Promise<RechazoIngreso | null> {
    return Promise.resolve(
      new RequiereValidacionManual().evaluar(contexto.lectura, contexto.umbral)
        ? {
            resultado: 'REQUIERE_LECTURA_MANUAL',
            motivo: 'Se requiere validación manual',
          }
        : null,
    );
  }
}

export class ValidarCupoIngreso implements ValidacionIngreso {
  async evaluar(
    contexto: ContextoValidacionIngreso,
  ): Promise<RechazoIngreso | null> {
    const { cupo, ocupacion } = await contexto.consultarCupo();
    return cupo.tieneDisponibilidad(ocupacion)
      ? null
      : { resultado: 'RECHAZADO', motivo: 'LLENO' };
  }
}

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorDominio } from './error-dominio';

export interface RespuestaError {
  estado: number;
  cuerpo: { codigo: string; motivo: string };
}

const MOTIVO_INTERNO = 'Error interno del servidor';

export function traducirExcepcion(excepcion: unknown): RespuestaError {
  if (excepcion instanceof ErrorDominio) {
    return {
      estado: HttpStatus.UNPROCESSABLE_ENTITY,
      cuerpo: { codigo: excepcion.codigo, motivo: excepcion.motivo },
    };
  }
  if (excepcion instanceof HttpException) {
    const estado = excepcion.getStatus();
    return {
      estado,
      cuerpo: {
        codigo: HttpStatus[estado] ?? 'ERROR_HTTP',
        motivo: extraerMotivo(excepcion),
      },
    };
  }
  return {
    estado: HttpStatus.INTERNAL_SERVER_ERROR,
    cuerpo: { codigo: 'ERROR_INTERNO', motivo: MOTIVO_INTERNO },
  };
}

function extraerMotivo(excepcion: HttpException): string {
  const respuesta = excepcion.getResponse();
  if (typeof respuesta === 'string') return respuesta;
  const mensaje = (respuesta as { message?: string | string[] }).message;
  if (Array.isArray(mensaje)) return mensaje.join('; ');
  return mensaje ?? excepcion.message;
}
import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { RespuestaErrorDto } from './respuesta-error.dto';

/** Respuestas compartidas, solo para las condiciones posibles en cada operación. */
export function ApiErrores({
  protegido = true,
  cuerpo = false,
  dominio = false,
  rol = 'ADMINISTRADOR',
} = {}) {
  return applyDecorators(
    ApiInternalServerErrorResponse({
      type: RespuestaErrorDto,
      description: 'Error interno; no se exponen detalles de infraestructura.',
    }),
    ...(protegido
      ? [
          ApiUnauthorizedResponse({
            type: RespuestaErrorDto,
            description: 'Falta el token Bearer, es inválido o está vencido.',
          }),
          ApiForbiddenResponse({
            type: RespuestaErrorDto,
            description: `El usuario está autenticado pero no tiene rol ${rol}.`,
          }),
        ]
      : []),
    ...(cuerpo
      ? [
          ApiBadRequestResponse({
            type: RespuestaErrorDto,
            description:
              'Cuerpo inválido, incompleto, con tipos incorrectos, duplicados o campos adicionales.',
          }),
        ]
      : []),
    ...(dominio
      ? [
          ApiUnprocessableEntityResponse({
            type: RespuestaErrorDto,
            description: 'Se incumple una regla de dominio.',
          }),
        ]
      : []),
  );
}

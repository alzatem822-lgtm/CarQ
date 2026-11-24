import { ApiProperty } from '@nestjs/swagger';

export class RespuestaErrorDto {
  @ApiProperty({
    example: 'BAD_REQUEST',
    description: 'Código HTTP simbólico o código de dominio.',
  })
  codigo!: string;

  @ApiProperty({
    example: 'El cuerpo de la solicitud no es válido',
    description:
      'Motivo legible del rechazo. Nunca incluye trazas ni credenciales.',
  })
  motivo!: string;
}

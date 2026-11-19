import { ApiProperty } from '@nestjs/swagger';

export class RolSesionRespuestaDto {
  @ApiProperty({
    enum: ['OPERADOR', 'ADMINISTRADOR'],
    example: 'ADMINISTRADOR',
  })
  rol!: string;
}

export class SesionRespuestaDto {
  @ApiProperty({
    description: 'JWT de sesión. Se envía en Authorization: Bearer <token>.',
    example: '<token-jwt-devuelto-por-el-servidor>',
  })
  token!: string;
  @ApiProperty({
    enum: ['OPERADOR', 'ADMINISTRADOR'],
    example: 'ADMINISTRADOR',
  })
  rol!: string;
}

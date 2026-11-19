import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InicioSesionDto {
  @ApiProperty({
    example: 'administrador',
    minLength: 1,
    description:
      'Nombre del usuario existente. Los usuarios iniciales se crean mediante el seed de desarrollo.',
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    example: '<contrasena-del-usuario>',
    minLength: 1,
    format: 'password',
    writeOnly: true,
    description: 'Contraseña del usuario. Nunca se devuelve en la respuesta.',
  })
  @IsString()
  @IsNotEmpty()
  contrasena!: string;
}

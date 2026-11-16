import { IsNotEmpty, IsString } from 'class-validator';

export class InicioSesionDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  contrasena!: string;
}
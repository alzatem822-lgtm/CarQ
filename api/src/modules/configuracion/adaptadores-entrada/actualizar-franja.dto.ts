import { IsInt } from 'class-validator';

export class ActualizarFranjaDto {
  @IsInt()
  inicioHora!: number;

  @IsInt()
  finHora!: number;
}
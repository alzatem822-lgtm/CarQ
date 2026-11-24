import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActualizarFranjaDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 23,
    example: 6,
    description:
      'Inicio inclusivo. Un entero fuera de rango se rechaza por dominio con 422 y FRANJA_INVALIDA.',
  })
  @IsInt()
  inicioHora!: number;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 24,
    example: 18,
    description:
      'Fin exclusivo, mayor que inicioHora. Un entero fuera de rango se rechaza con 422 y FRANJA_INVALIDA.',
  })
  @IsInt()
  finHora!: number;
}

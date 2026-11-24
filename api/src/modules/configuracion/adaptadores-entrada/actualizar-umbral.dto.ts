import { IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActualizarUmbralDto {
  @ApiProperty({
    minimum: 0,
    maximum: 1,
    example: 0.85,
    description:
      'Número entre 0 y 1. Se persiste con precisión de dos decimales.',
  })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El umbral de confianza debe ser un número' },
  )
  @Min(0, { message: 'El umbral de confianza no puede ser menor que 0' })
  @Max(1, { message: 'El umbral de confianza no puede ser mayor que 1' })
  umbral!: number;
}

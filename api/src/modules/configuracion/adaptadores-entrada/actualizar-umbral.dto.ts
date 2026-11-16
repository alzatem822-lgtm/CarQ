import { IsNumber, Max, Min } from 'class-validator';

export class ActualizarUmbralDto {
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El umbral de confianza debe ser un número' },
  )
  @Min(0, { message: 'El umbral de confianza no puede ser menor que 0' })
  @Max(1, { message: 'El umbral de confianza no puede ser mayor que 1' })
  umbral!: number;
}
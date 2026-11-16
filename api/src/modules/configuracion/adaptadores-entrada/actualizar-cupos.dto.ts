import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CupoDto {
  @IsString({ message: 'El tipo de vehículo de cada cupo debe ser texto' })
  @IsNotEmpty({ message: 'El tipo de vehículo de cada cupo es obligatorio' })
  tipoVehiculo!: string;

  @IsInt({ message: 'El máximo de cada cupo debe ser un número entero' })
  @Min(0, { message: 'El máximo de cada cupo no puede ser negativo' })
  maximo!: number;
}

export class ActualizarCuposDto {
  @IsArray({ message: 'Los cupos deben enviarse como una lista' })
  @ArrayMinSize(1, { message: 'Envía al menos un cupo' })
  @ValidateNested({ each: true })
  @Type(() => CupoDto)
  cupos!: CupoDto[];
}
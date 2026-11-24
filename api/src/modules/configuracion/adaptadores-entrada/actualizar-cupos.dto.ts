import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsNotEmpty,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export class CupoDto {
  @ApiProperty({ enum: ['CARRO', 'MOTO'], example: 'CARRO' })
  @IsString({ message: 'El tipo de vehículo de cada cupo debe ser texto' })
  @IsNotEmpty({ message: 'El tipo de vehículo de cada cupo es obligatorio' })
  tipoVehiculo!: string;

  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    example: 10,
  })
  @IsInt({ message: 'El máximo de cada cupo debe ser un número entero' })
  @Min(0, { message: 'El máximo de cada cupo no puede ser negativo' })
  @Max(2147483647, {
    message: 'El máximo de cada cupo no puede superar 2147483647',
  })
  maximo!: number;
}

export class ActualizarCuposDto {
  @ApiProperty({
    type: [CupoDto],
    minItems: 1,
    description:
      'Cada tipo aparece como máximo una vez. El lote se confirma o revierte por completo.',
    example: [
      { tipoVehiculo: 'CARRO', maximo: 10 },
      { tipoVehiculo: 'MOTO', maximo: 15 },
    ],
  })
  @IsArray({ message: 'Los cupos deben enviarse como una lista' })
  @ArrayMinSize(1, { message: 'Envía al menos un cupo' })
  @IsObject({ each: true, message: 'Cada cupo debe ser un objeto' })
  @ValidateNested({ each: true })
  @Type(() => CupoDto)
  cupos!: CupoDto[];
}

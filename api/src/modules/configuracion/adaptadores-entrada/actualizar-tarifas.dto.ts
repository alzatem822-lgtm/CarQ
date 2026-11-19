import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
export class TarifaDto {
  @ApiProperty({ enum: ['CARRO', 'MOTO'], example: 'CARRO' })
  @IsIn(['CARRO', 'MOTO'])
  tipoVehiculo!: string;
  @ApiProperty({ enum: ['DIURNA', 'NOCTURNA'], example: 'DIURNA' })
  @IsIn(['DIURNA', 'NOCTURNA'])
  franja!: 'DIURNA' | 'NOCTURNA';
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 2147483647,
    example: 6000,
    description: 'Valor en pesos colombianos enteros.',
  })
  @IsInt()
  @Min(0)
  @Max(2147483647)
  valor!: number;
}
export class ActualizarTarifasDto {
  @ApiProperty({
    type: [TarifaDto],
    minItems: 1,
    description:
      'Actualización parcial o completa. Sin pares tipo/franja duplicados. Se valida el conjunto resultante con los valores vigentes.',
    example: [
      { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 6000 },
      { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 4000 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((tarifa: TarifaDto) => `${tarifa.tipoVehiculo}:${tarifa.franja}`)
  @ValidateNested({ each: true })
  @Type(() => TarifaDto)
  tarifas!: TarifaDto[];
}
export class ActualizarFranjaDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 23,
    example: 6,
    description: 'Inicio inclusivo; debe ser menor que finHora.',
  })
  @IsInt()
  @Min(0)
  @Max(23)
  inicioHora!: number;
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 24,
    example: 18,
    description: 'Fin exclusivo; 24 representa el final del día.',
  })
  @IsInt()
  @Min(1)
  @Max(24)
  finHora!: number;
}

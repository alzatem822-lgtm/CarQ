import { ApiProperty } from '@nestjs/swagger';

export class CupoRespuestaDto {
  @ApiProperty({ enum: ['CARRO', 'MOTO'], example: 'CARRO' })
  tipoVehiculo!: string;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    example: 3,
    description: 'Capacidad máxima configurada.',
  })
  maximo!: number;
}
export class CuposRespuestaDto {
  @ApiProperty({ type: [CupoRespuestaDto] }) cupos!: CupoRespuestaDto[];
}
export class UmbralRespuestaDto {
  @ApiProperty({
    minimum: 0,
    maximum: 1,
    example: 0.85,
    description: 'Valor persistido con precisión de dos decimales.',
  })
  umbral!: number;
}
export class FranjaRespuestaDto {
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    maximum: 23,
    example: 6,
    description: 'Hora inicial inclusiva.',
  })
  inicioHora!: number;
  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: 24,
    example: 18,
    description: 'Hora final exclusiva. La nocturna cubre el resto del día.',
  })
  finHora!: number;
}
export class TarifaRespuestaDto {
  @ApiProperty({ enum: ['CARRO', 'MOTO'], example: 'CARRO' })
  tipoVehiculo!: string;
  @ApiProperty({ enum: ['DIURNA', 'NOCTURNA'], example: 'DIURNA' })
  franja!: string;
  @ApiProperty({
    type: 'integer',
    minimum: 0,
    example: 5000,
    description: 'Valor en COP enteros.',
  })
  valor!: number;
}
export class TarifasRespuestaDto {
  @ApiProperty({ type: [TarifaRespuestaDto] }) tarifas!: TarifaRespuestaDto[];
  @ApiProperty({ type: FranjaRespuestaDto }) franja!: FranjaRespuestaDto;
}

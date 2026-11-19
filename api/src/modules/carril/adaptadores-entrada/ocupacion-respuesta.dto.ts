import { ApiProperty } from '@nestjs/swagger';

export class OcupacionPorTipoDto {
  @ApiProperty({ example: 'CARRO' })
  tipoVehiculo!: string;

  @ApiProperty({ type: 'integer', minimum: 0, example: 2 })
  ocupacion!: number;

  @ApiProperty({ type: 'integer', minimum: 0, example: 3 })
  maximo!: number;
}

export class OcupacionRespuestaDto {
  @ApiProperty({ type: [OcupacionPorTipoDto] })
  cupos!: OcupacionPorTipoDto[];
}

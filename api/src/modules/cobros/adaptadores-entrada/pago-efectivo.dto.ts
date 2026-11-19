import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { ResultadoPago } from '../aplicacion/registrar-pago-efectivo';
import { aCobroCaja, CobroCajaDto } from './caja.dto';

export class PagoEfectivoDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 2147483647 })
  @IsInt()
  @Min(1)
  @Max(2147483647)
  cobroId!: number;

  @ApiProperty({ example: 'caja-2044a46f', minLength: 1, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  referencia!: string;
}

export class PagoCajaDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'caja-2044a46f' }) referencia!: string;
  @ApiProperty({ example: 5000 }) monto!: number;
  @ApiProperty({ example: 'operador' }) operador!: string;
  @ApiProperty({ type: String, format: 'date-time' }) fecha!: string;
}

export class ResultadoPagoDto {
  @ApiProperty({ type: CobroCajaDto }) cobro!: CobroCajaDto;
  @ApiProperty({ type: PagoCajaDto }) pago!: PagoCajaDto;
}

export function aResultadoPago({
  cobro,
  pago,
}: ResultadoPago): ResultadoPagoDto {
  if (pago.id === null) throw new Error('El pago de Caja no está persistido.');
  return {
    cobro: aCobroCaja(cobro),
    pago: {
      id: pago.id,
      referencia: pago.referencia,
      monto: pago.monto,
      operador: pago.operador,
      fecha: pago.fecha.toISOString(),
    },
  };
}

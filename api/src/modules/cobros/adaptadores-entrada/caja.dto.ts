import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { Cobro } from '../dominio/cobro';

export class BuscarPendientesDto {
  @ApiProperty({ example: 'ABC123', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  placa!: string;
}

export class CobroCajaDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'ABC123' }) placa!: string;
  @ApiProperty({ example: 'CARRO' }) tipoVehiculo!: string;
  @ApiProperty({ example: '2026-11-19', format: 'date' }) diaOperativo!: string;
  @ApiProperty({ enum: ['DIURNA', 'NOCTURNA'] }) franja!: Cobro['franja'];
  @ApiProperty({ example: 5000 }) tarifaAplicada!: number;
  @ApiProperty({ enum: ['PENDIENTE', 'PAGADO', 'ANULADO'] })
  estado!: Cobro['estado'];
}

export class PendientesCajaDto {
  @ApiProperty({ type: [CobroCajaDto] }) cobros!: CobroCajaDto[];
}

export function aCobroCaja(cobro: Cobro): CobroCajaDto {
  if (cobro.id === null)
    throw new Error('El cobro de Caja no está persistido.');
  return {
    id: cobro.id,
    placa: cobro.placa.valor,
    tipoVehiculo: cobro.tipoVehiculo.codigo,
    diaOperativo: cobro.diaOperativo,
    franja: cobro.franja,
    tarifaAplicada: cobro.tarifaAplicada,
    estado: cobro.estado,
  };
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { Cobro } from '../dominio/cobro';
import { aCobroCaja, CobroCajaDto } from './caja.dto';

export class AnularCobroDto {
  @ApiProperty({ example: 'Cobro generado por error', minLength: 1 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  motivo!: string;
}

export class CobroAnuladoDto extends CobroCajaDto {
  @ApiProperty({ enum: ['ANULADO'] })
  declare estado: 'ANULADO';

  @ApiProperty({ example: 'administrador' })
  anuladoPor!: string;

  @ApiProperty({ example: 'Cobro generado por error' })
  motivoAnulacion!: string;
}

export function aCobroAnulado(cobro: Cobro): CobroAnuladoDto {
  const { estado, anuladoPor, motivoAnulacion } = cobro;
  if (estado !== 'ANULADO' || !anuladoPor || !motivoAnulacion) {
    throw new Error('El cobro no tiene registrada una anulación.');
  }

  return { ...aCobroCaja(cobro), estado, anuladoPor, motivoAnulacion };
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  ESTADOS_COBRO,
  type CodigoEstadoCobro,
} from '../../cobros/dominio/estado-cobro';
import type { TipoFranja } from '../../configuracion/dominio/franja';
import type { FiltrosCobros } from '../aplicacion/consultar-cobros';
import type { CobroConsultado } from '../aplicacion/consulta-cobros.repository';
import type { PaginaConsulta } from '../aplicacion/pagina-consulta';
import { FiltrosConsultaDto } from './filtros-consulta.dto';

export class FiltrosCobrosDto
  extends FiltrosConsultaDto
  implements FiltrosCobros
{
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Día operativo inicial inclusivo.',
  })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Día operativo final inclusivo.',
  })
  @IsOptional()
  @IsString()
  hasta?: string;

  @ApiPropertyOptional({ enum: ESTADOS_COBRO })
  @IsOptional()
  @IsIn(ESTADOS_COBRO)
  estado?: CodigoEstadoCobro;
}

class CobroConsultaDto implements CobroConsultado {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: String })
  placa!: string;

  @ApiProperty({ type: String })
  tipoVehiculo!: string;

  @ApiProperty({ type: String, format: 'date' })
  diaOperativo!: string;

  @ApiProperty({ enum: ['DIURNA', 'NOCTURNA'] })
  franja!: TipoFranja;

  @ApiProperty({ type: Number, description: 'Importe en pesos colombianos.' })
  tarifaAplicada!: number;

  @ApiProperty({ enum: ESTADOS_COBRO })
  estado!: CodigoEstadoCobro;
}

export class PaginaCobrosDto implements PaginaConsulta<CobroConsultado> {
  @ApiProperty({ type: [CobroConsultaDto] })
  elementos!: readonly CobroConsultado[];

  @ApiProperty({ type: Boolean })
  haySiguiente!: boolean;
}

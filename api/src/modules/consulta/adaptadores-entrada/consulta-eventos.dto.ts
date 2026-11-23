import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  RESULTADOS_EVENTO,
  SENTIDOS_EVENTO,
  type ResultadoEvento,
  type SentidoEvento,
} from '../../carril/dominio/evento';
import {
  ORIGENES_LECTURA,
  type OrigenLectura,
} from '../../vehiculos/dominio/lectura-placa';
import type { FiltrosEventos } from '../aplicacion/consultar-eventos';
import type { EventoConsultado } from '../aplicacion/consulta-eventos.repository';
import type { PaginaConsulta } from '../aplicacion/pagina-consulta';
import { FiltrosConsultaDto } from './filtros-consulta.dto';

export class FiltrosEventosDto
  extends FiltrosConsultaDto
  implements FiltrosEventos
{
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Instante inicial inclusivo con zona horaria.',
  })
  @IsOptional()
  @IsString()
  desde?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Instante final exclusivo con zona horaria.',
  })
  @IsOptional()
  @IsString()
  hasta?: string;

  @ApiPropertyOptional({ enum: RESULTADOS_EVENTO })
  @IsOptional()
  @IsIn(RESULTADOS_EVENTO)
  resultado?: ResultadoEvento;
}

class EventoConsultaDto implements EventoConsultado {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: Number })
  carrilId!: number;

  @ApiProperty({ type: String, nullable: true })
  placa!: string | null;

  @ApiProperty({ enum: SENTIDOS_EVENTO })
  sentido!: SentidoEvento;

  @ApiProperty({ enum: RESULTADOS_EVENTO })
  resultado!: ResultadoEvento;

  @ApiProperty({ type: String })
  motivo!: string;

  @ApiProperty({ enum: ORIGENES_LECTURA })
  origen!: OrigenLectura;

  @ApiProperty({ type: String, format: 'date-time' })
  ocurridoEn!: Date;
}

export class PaginaEventosDto implements PaginaConsulta<EventoConsultado> {
  @ApiProperty({ type: [EventoConsultaDto] })
  elementos!: readonly EventoConsultado[];

  @ApiProperty({ type: Boolean })
  haySiguiente!: boolean;
}

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { FiltrosConsulta } from '../aplicacion/validar-filtros-consulta';

export class FiltrosConsultaDto implements FiltrosConsulta {
  @ApiPropertyOptional({ type: String, example: 'ABC123' })
  @IsOptional()
  @IsString()
  placa?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamanioPagina?: number;
}

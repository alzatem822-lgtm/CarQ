import { ApiProperty } from '@nestjs/swagger';
import { RESULTADOS_EVENTO, type ResultadoEvento } from '../dominio/evento';
import type {
  EstadoBarrera,
  OrigenLectura,
  SentidoCarril,
} from '../dominio/estado-carril';

class LecturaCarrilDto {
  @ApiProperty({ example: 'ABC123' })
  placa!: string;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.95 })
  confianza!: number;

  @ApiProperty({ enum: ['SIMULADO', 'MANUAL', 'OCR'] })
  origen!: OrigenLectura;
}

class ResultadoCarrilDto {
  @ApiProperty({ enum: RESULTADOS_EVENTO })
  resultado!: ResultadoEvento;

  @ApiProperty({ example: 'Cobro pendiente' })
  motivo!: string;
}

class BarreraEstadoDto {
  @ApiProperty({ enum: ['ABIERTA', 'CERRADA'] })
  estado!: EstadoBarrera;

  @ApiProperty({ type: String, nullable: true, example: null })
  motivo!: string | null;
}

export class EstadoCarrilRespuestaDto {
  @ApiProperty({ example: false })
  vehiculoPresente!: boolean;

  @ApiProperty({ type: String, enum: ['ENTRADA', 'SALIDA'], nullable: true })
  sentido!: SentidoCarril | null;

  @ApiProperty({ type: LecturaCarrilDto, nullable: true })
  ultimaLectura!: LecturaCarrilDto | null;

  @ApiProperty({ type: ResultadoCarrilDto, nullable: true })
  ultimoResultado!: ResultadoCarrilDto | null;

  @ApiProperty({ type: BarreraEstadoDto })
  barrera!: BarreraEstadoDto;

  @ApiProperty({ example: false })
  requiereValidacionManual!: boolean;
}

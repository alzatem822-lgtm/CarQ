import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsNumber,
  ValidateIf,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import {
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ProcesarSalida } from '../aplicacion/procesar-salida';
import { RESULTADOS_EVENTO, type ResultadoEvento } from '../dominio/evento';

class SalidaDto {
  @ApiPropertyOptional({ example: 'ABC123', maxLength: 32 })
  @ValidateIf((_objeto: unknown, valor: unknown) => valor !== undefined)
  @IsString()
  @MaxLength(32)
  placa?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, example: 0.95 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  )
  @ValidateIf((_objeto: unknown, valor: unknown) => valor !== undefined)
  @IsNumber()
  @Min(0)
  @Max(1)
  confianza?: number;
}

class SalidaRespuestaDto {
  @ApiProperty({ enum: RESULTADOS_EVENTO }) resultado!: ResultadoEvento;
  @ApiProperty({ example: 'Salida autorizado' }) motivo!: string;
}

@Controller('carril/salida')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
@ApiBearerAuth('sesion')
@ApiTags('Carril')
export class SalidaController {
  constructor(
    private readonly procesar: ProcesarSalida,
    @Inject('ResolverCarrilIngreso')
    private readonly resolverCarril: () => Promise<{
      sedeId: number;
      carrilId: number;
    }>,
  ) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiConsumes('application/json', 'multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        placa: { type: 'string', maxLength: 32 },
        confianza: { type: 'number', minimum: 0, maximum: 1 },
        imagen: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    operationId: 'procesarSalida',
    summary: 'Procesar salida de un vehículo',
    description:
      'Solo OPERADOR. Recibe placa con confianza o una imagen de hasta 5 MiB y delega al lector configurado. El simulador no interpreta imágenes y solicita lectura manual. Un rechazo de negocio devuelve 200 con resultado y motivo. La barrera se ordena después del commit.',
  })
  @ApiOkResponse({ type: SalidaRespuestaDto })
  @ApiErrores({ cuerpo: true, dominio: true, rol: 'OPERADOR' })
  async salir(
    @Body() dto: SalidaDto,
    @Req() solicitud: SolicitudAutenticada,
    @UploadedFile() imagen?: { buffer: Buffer },
  ): Promise<SalidaRespuestaDto> {
    if (!solicitud.usuario) throw new UnauthorizedException();
    if (imagen && dto.placa !== undefined)
      throw new BadRequestException('Envía una imagen o una placa, no ambas');
    if (imagen && dto.confianza !== undefined)
      throw new BadRequestException(
        'La confianza de una imagen la determina el lector',
      );
    const { sedeId, carrilId } = await this.resolverCarril();
    return this.procesar.ejecutar(
      sedeId,
      carrilId,
      {
        ...dto,
        imagen: imagen?.buffer,
      },
      solicitud.usuario.nombre,
    );
  }
}

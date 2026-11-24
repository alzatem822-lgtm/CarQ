import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import {
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ConfirmarLecturaManual } from '../aplicacion/confirmar-lectura-manual';
import {
  RESULTADOS_EVENTO,
  SENTIDOS_EVENTO,
  type ResultadoEvento,
  type SentidoEvento,
} from '../dominio/evento';

class ConfirmarLecturaManualDto {
  @ApiProperty({ enum: SENTIDOS_EVENTO, example: 'ENTRADA' })
  @IsIn(SENTIDOS_EVENTO)
  sentido!: SentidoEvento;

  @ApiProperty({ example: 'ABC123', minLength: 1, maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  placa!: string;
}

class ConfirmacionManualRespuestaDto {
  @ApiProperty({ enum: RESULTADOS_EVENTO }) resultado!: ResultadoEvento;
  @ApiProperty({ example: 'Ingreso autorizado' }) motivo!: string;
}

@Controller('carril/lectura-manual')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
@ApiBearerAuth('sesion')
@ApiTags('Carril')
export class LecturaManualController {
  constructor(
    private readonly confirmar: ConfirmarLecturaManual,
    @Inject('ResolverCarrilIngreso')
    private readonly resolverCarril: () => Promise<{
      sedeId: number;
      carrilId: number;
    }>,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiBody({ type: ConfirmarLecturaManualDto })
  @ApiOperation({
    operationId: 'confirmarLecturaManual',
    summary: 'Confirmar placa manual para ingreso o salida',
    description:
      'Solo OPERADOR. Recibe sentido y placa; el operador se obtiene del JWT y el carril de la configuración. Usa siempre el lector manual y conserva las validaciones de cupo, estancia y pago. Los rechazos de negocio responden 200 con resultado y motivo. La barrera se ordena después del commit.',
  })
  @ApiOkResponse({ type: ConfirmacionManualRespuestaDto })
  @ApiErrores({ cuerpo: true, dominio: true, rol: 'OPERADOR' })
  async ejecutar(
    @Body() dto: ConfirmarLecturaManualDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<ConfirmacionManualRespuestaDto> {
    if (!solicitud.usuario) throw new UnauthorizedException();
    const { sedeId, carrilId } = await this.resolverCarril();
    return this.confirmar.ejecutar({
      sedeId,
      carrilId,
      sentido: dto.sentido,
      placa: dto.placa,
      operador: solicitud.usuario.nombre,
    });
  }
}

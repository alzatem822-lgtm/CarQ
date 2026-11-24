import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RespuestaErrorDto } from '../../../compartido/documentacion/respuesta-error.dto';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import {
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { AnularCobro } from '../aplicacion/anular-cobro';
import {
  aCobroAnulado,
  AnularCobroDto,
  CobroAnuladoDto,
} from './anulacion-cobro.dto';
import { SEDE_CAJA } from './caja.controller';

@ApiTags('Cobros')
@ApiBearerAuth('sesion')
@Controller('cobros')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR)
export class AnulacionCobroController {
  constructor(
    private readonly anularCobro: AnularCobro,
    @Inject(SEDE_CAJA) private readonly sede: () => Promise<number>,
  ) {}

  @Post(':cobroId/anulacion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'anularCobro',
    summary: 'Anular un cobro pendiente',
    description:
      'Solo para administradores. Guarda el motivo y el usuario de la sesión.',
  })
  @ApiParam({
    name: 'cobroId',
    schema: { type: 'integer', minimum: 1, maximum: 2147483647 },
  })
  @ApiBody({ type: AnularCobroDto })
  @ApiOkResponse({ type: CobroAnuladoDto })
  @ApiNotFoundResponse({
    type: RespuestaErrorDto,
    description: 'No existe el cobro en la sede.',
  })
  @ApiErrores({ cuerpo: true, dominio: true })
  async anular(
    @Param('cobroId', ParseIntPipe) cobroId: number,
    @Body() dto: AnularCobroDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<CobroAnuladoDto> {
    if (!solicitud.usuario) throw new UnauthorizedException();
    if (cobroId < 1 || cobroId > 2147483647) {
      throw new BadRequestException('El identificador del cobro no es válido.');
    }

    const cobro = await this.anularCobro.ejecutar({
      cobroId,
      sedeId: await this.sede(),
      usuario: solicitud.usuario.nombre,
      motivo: dto.motivo,
    });
    if (!cobro) throw new NotFoundException('No existe el cobro en la sede.');

    return aCobroAnulado(cobro);
  }
}

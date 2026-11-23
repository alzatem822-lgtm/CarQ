import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RespuestaErrorDto } from '../../../compartido/documentacion/respuesta-error.dto';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ConsultarCobros } from '../aplicacion/consultar-cobros';
import { ConsultarEventos } from '../aplicacion/consultar-eventos';
import { FiltrosCobrosDto, PaginaCobrosDto } from './consulta-cobros.dto';
import { FiltrosEventosDto, PaginaEventosDto } from './consulta-eventos.dto';

@Controller('consulta')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR, Rol.OPERADOR)
@ApiTags('Consulta')
@ApiBearerAuth('sesion')
@ApiErrores({ dominio: true, rol: 'ADMINISTRADOR u OPERADOR' })
@ApiBadRequestResponse({
  type: RespuestaErrorDto,
  description: 'Parámetros de consulta inválidos.',
})
export class ConsultaController {
  constructor(
    private readonly eventos: ConsultarEventos,
    private readonly cobros: ConsultarCobros,
    @Inject('ResolverSedeConsulta')
    private readonly resolverSede: () => Promise<number>,
  ) {}

  @Get('eventos')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'consultarEventos',
    summary: 'Consultar eventos del carril por sede',
  })
  @ApiOkResponse({ type: PaginaEventosDto })
  async consultarEventos(
    @Query() filtros: FiltrosEventosDto,
  ): Promise<PaginaEventosDto> {
    return this.eventos.ejecutar(await this.resolverSede(), filtros);
  }

  @Get('cobros')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'consultarCobros',
    summary: 'Consultar cobros por sede y día operativo',
  })
  @ApiOkResponse({ type: PaginaCobrosDto })
  async consultarCobros(
    @Query() filtros: FiltrosCobrosDto,
  ): Promise<PaginaCobrosDto> {
    return this.cobros.ejecutar(await this.resolverSede(), filtros);
  }
}

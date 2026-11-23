import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { ConfiguracionSistema } from '../../../compartido/configuracion/configuracion-sistema';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ConsultarEstadoCarril } from '../aplicacion/consultar-estado-carril';
import { EstadoCarrilRespuestaDto } from './estado-carril-respuesta.dto';

@Controller('carril/estado')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
@ApiBearerAuth('sesion')
@ApiTags('Carril')
export class EstadoCarrilController {
  constructor(
    private readonly consultarEstado: ConsultarEstadoCarril,
    private readonly configuracion: ConfiguracionSistema,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'consultarEstadoCarril',
    summary: 'Consultar estado actual del carril',
    description:
      'Solo OPERADOR. Devuelve presencia, barrera, última lectura y último resultado con motivo. No registra operaciones ni modifica el estado.',
  })
  @ApiOkResponse({ type: EstadoCarrilRespuestaDto })
  @ApiErrores({ rol: 'OPERADOR' })
  async consultar(): Promise<EstadoCarrilRespuestaDto> {
    return {
      ...(await this.consultarEstado.ejecutar()),
      simulacionHabilitada:
        this.configuracion.obtener('FUENTE_SENSOR') === 'simulado',
    };
  }
}

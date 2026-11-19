import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ConsultarOcupacion } from '../aplicacion/consultar-ocupacion';
import { OcupacionRespuestaDto } from './ocupacion-respuesta.dto';

@Controller('carril/ocupacion')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
@ApiTags('Carril')
@ApiBearerAuth('sesion')
export class OcupacionController {
  constructor(
    private readonly consultarOcupacion: ConsultarOcupacion,
    @Inject('ResolverSedeCarril')
    private readonly resolverSede: () => Promise<number>,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'consultarOcupacion',
    summary: 'Consultar ocupación y capacidad por tipo',
    description:
      'Solo OPERADOR. Devuelve estancias abiertas y máximos configurados de la sede principal.',
  })
  @ApiOkResponse({ type: OcupacionRespuestaDto })
  @ApiErrores()
  async consultar(): Promise<OcupacionRespuestaDto> {
    const sedeId = await this.resolverSede();
    return { cupos: await this.consultarOcupacion.ejecutar(sedeId) };
  }
}

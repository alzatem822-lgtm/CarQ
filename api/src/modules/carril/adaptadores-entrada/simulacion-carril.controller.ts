import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { SimularLlegada } from '../aplicacion/simular-llegada';

class LlegadaSimuladaRespuestaDto {
  @ApiProperty({ enum: [true], example: true })
  vehiculoPresente!: boolean;
}

/** Se publica únicamente cuando la fuente del sensor es simulada. */
@Controller('carril/simulacion/llegada')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
@ApiBearerAuth('sesion')
@ApiTags('Carril')
export class SimulacionCarrilController {
  constructor(private readonly simularLlegada: SimularLlegada) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    operationId: 'simularLlegada',
    summary: 'Simular llegada de un vehículo',
    description:
      'Solo OPERADOR y sensor simulado. Marca presencia sin registrar un ingreso ni abrir la barrera.',
  })
  @ApiOkResponse({ type: LlegadaSimuladaRespuestaDto })
  @ApiErrores({ rol: 'OPERADOR' })
  async simular(): Promise<LlegadaSimuladaRespuestaDto> {
    await this.simularLlegada.ejecutar();
    return { vehiculoPresente: true };
  }
}

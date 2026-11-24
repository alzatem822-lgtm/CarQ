import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ActualizarCupo } from '../aplicacion/actualizar-cupo';
import { ConsultarCupos } from '../aplicacion/consultar-cupos';
import { ActualizarCuposDto } from './actualizar-cupos.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { CuposRespuestaDto } from './configuracion-respuesta.dto';

export interface RespuestaCupos {
  cupos: { tipoVehiculo: string; maximo: number }[];
}

@Controller('configuracion/cupos')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR)
@ApiTags('Cupos')
@ApiBearerAuth('sesion')
export class CuposController {
  constructor(
    private readonly consultarCupos: ConsultarCupos,
    private readonly actualizarCupo: ActualizarCupo,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'consultarCupos',
    summary: 'Consultar capacidad por tipo',
    description:
      'Solo ADMINISTRADOR. Devuelve máximos configurados de la sede, no ocupación.',
  })
  @ApiOkResponse({ type: CuposRespuestaDto })
  @ApiErrores()
  async consultar(): Promise<RespuestaCupos> {
    return this.respuesta();
  }

  @Put()
  @ApiOperation({
    operationId: 'actualizarCupos',
    summary: 'Actualizar capacidad por tipo',
    description:
      'Solo ADMINISTRADOR. Actualiza los tipos incluidos en una única transacción. Los tipos omitidos conservan su capacidad.',
  })
  @ApiBody({ type: ActualizarCuposDto })
  @ApiOkResponse({
    type: CuposRespuestaDto,
    description: 'Capacidades vigentes después del guardado.',
  })
  @ApiErrores({ cuerpo: true })
  async actualizar(@Body() dto: ActualizarCuposDto): Promise<RespuestaCupos> {
    // Se valida todo el pedido antes de guardar, para no dejar cambios a medias.
    const pedidos = dto.cupos.map((cupo) => ({
      tipo: this.resolverTipo(cupo.tipoVehiculo),
      maximo: cupo.maximo,
    }));
    const codigos = pedidos.map((pedido) => pedido.tipo.codigo);
    if (new Set(codigos).size !== codigos.length) {
      throw new BadRequestException(
        'Hay un tipo de vehículo repetido en la lista de cupos',
      );
    }

    await this.actualizarCupo.ejecutarVarios(pedidos);
    return this.respuesta();
  }

  private resolverTipo(codigo: string): TipoVehiculo {
    try {
      return TipoVehiculo.desde(codigo);
    } catch {
      throw new BadRequestException(`Tipo de vehículo desconocido: ${codigo}`);
    }
  }

  private async respuesta(): Promise<RespuestaCupos> {
    const cupos = await this.consultarCupos.ejecutar();
    return {
      cupos: cupos.map((cupo) => ({
        tipoVehiculo: cupo.tipoVehiculo.codigo,
        maximo: cupo.maximo,
      })),
    };
  }
}

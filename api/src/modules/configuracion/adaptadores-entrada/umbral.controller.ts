import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ActualizarUmbral } from '../aplicacion/actualizar-umbral';
import { ConsultarUmbral } from '../aplicacion/consultar-umbral';
import { ActualizarUmbralDto } from './actualizar-umbral.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { UmbralRespuestaDto } from './configuracion-respuesta.dto';

export interface RespuestaUmbral {
  umbral: number;
}

@Controller('configuracion/umbral')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR)
@ApiTags('Umbral')
@ApiBearerAuth('sesion')
export class UmbralController {
  constructor(
    private readonly consultarUmbral: ConsultarUmbral,
    private readonly actualizarUmbral: ActualizarUmbral,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'consultarUmbral',
    summary: 'Consultar umbral de confianza',
    description:
      'Solo ADMINISTRADOR. Configurar este valor no ejecuta una lectura OCR.',
  })
  @ApiOkResponse({ type: UmbralRespuestaDto })
  @ApiErrores()
  async consultar(): Promise<RespuestaUmbral> {
    return this.respuesta();
  }

  @Put()
  @ApiOperation({
    operationId: 'actualizarUmbral',
    summary: 'Actualizar umbral de confianza',
    description:
      'Solo ADMINISTRADOR. Acepta los límites 0 y 1 y devuelve el valor efectivamente persistido.',
  })
  @ApiBody({ type: ActualizarUmbralDto })
  @ApiOkResponse({ type: UmbralRespuestaDto })
  @ApiErrores({ cuerpo: true })
  async actualizar(@Body() dto: ActualizarUmbralDto): Promise<RespuestaUmbral> {
    await this.actualizarUmbral.ejecutar(dto.umbral);
    return this.respuesta();
  }

  private async respuesta(): Promise<RespuestaUmbral> {
    const umbral = await this.consultarUmbral.ejecutar();
    return { umbral: umbral.valor };
  }
}

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { ActualizarUmbral } from '../aplicacion/actualizar-umbral';
import { ConsultarUmbral } from '../aplicacion/consultar-umbral';
import { ActualizarUmbralDto } from './actualizar-umbral.dto';

export interface RespuestaUmbral {
  umbral: number;
}

@Controller('configuracion/umbral')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR)
export class UmbralController {
  constructor(
    private readonly consultarUmbral: ConsultarUmbral,
    private readonly actualizarUmbral: ActualizarUmbral,
  ) {}

  @Get()
  async consultar(): Promise<RespuestaUmbral> {
    return this.respuesta();
  }

  @Put()
  async actualizar(@Body() dto: ActualizarUmbralDto): Promise<RespuestaUmbral> {
    await this.actualizarUmbral.ejecutar(dto.umbral);
    return this.respuesta();
  }

  private async respuesta(): Promise<RespuestaUmbral> {
    const umbral = await this.consultarUmbral.ejecutar();
    return { umbral: umbral.valor };
  }
}
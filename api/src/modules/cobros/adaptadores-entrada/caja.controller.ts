import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  UnauthorizedException,
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
import {
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { PlacaInvalidaError } from '../../vehiculos/dominio/placa-invalida.error';
import { Placa } from '../../vehiculos/dominio/placa';
import { BuscarCobroPendientePorPlaca } from '../aplicacion/buscar-cobro-pendiente-por-placa';
import { RegistrarPagoEfectivo } from '../aplicacion/registrar-pago-efectivo';
import {
  aResultadoPago,
  PagoEfectivoDto,
  ResultadoPagoDto,
} from './pago-efectivo.dto';
import { aCobroCaja, BuscarPendientesDto, PendientesCajaDto } from './caja.dto';

export const SEDE_CAJA = Symbol('SEDE_CAJA');

@ApiTags('Caja')
@ApiBearerAuth('sesion')
@Controller()
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.OPERADOR)
export class CajaController {
  constructor(
    private readonly buscarCobros: BuscarCobroPendientePorPlaca,
    private readonly registrarPago: RegistrarPagoEfectivo,
    @Inject(SEDE_CAJA) private readonly sede: () => Promise<number>,
  ) {}

  @Get('cobros/pendientes')
  @ApiOperation({
    summary: 'Buscar cobros pendientes por placa',
    description:
      'Incluye el día operativo actual y los anteriores. Una lista vacía indica que no hay pendientes.',
  })
  @ApiOkResponse({ type: PendientesCajaDto })
  @ApiErrores({ rol: 'OPERADOR' })
  @ApiBadRequestResponse({
    type: RespuestaErrorDto,
    description: 'Placa o parámetros de consulta inválidos.',
  })
  async buscar(
    @Query() consulta: BuscarPendientesDto,
  ): Promise<PendientesCajaDto> {
    let placa: Placa;
    try {
      placa = Placa.crear(consulta.placa);
    } catch (error) {
      if (error instanceof PlacaInvalidaError) {
        throw new BadRequestException(
          'La placa debe tener formato ABC123 o ABC12A.',
        );
      }
      throw error;
    }
    return {
      cobros: (await this.buscarCobros.ejecutar(placa, await this.sede())).map(
        aCobroCaja,
      ),
    };
  }

  @Post('pagos/efectivo')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Registrar un pago en efectivo',
    description:
      'Reenviar la misma referencia para el mismo cobro devuelve el pago original.',
  })
  @ApiOkResponse({ type: ResultadoPagoDto })
  @ApiErrores({ rol: 'OPERADOR', cuerpo: true, dominio: true })
  async pagar(
    @Body() dto: PagoEfectivoDto,
    @Req() solicitud: SolicitudAutenticada,
  ): Promise<ResultadoPagoDto> {
    if (!solicitud.usuario) throw new UnauthorizedException();
    return aResultadoPago(
      await this.registrarPago.ejecutar({
        cobroId: dto.cobroId,
        referencia: dto.referencia,
        sedeId: await this.sede(),
        operador: solicitud.usuario.nombre,
      }),
    );
  }
}

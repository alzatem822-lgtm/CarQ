import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  CredencialesInvalidas,
  IniciarSesion,
} from '../aplicacion/iniciar-sesion';
import { InicioSesionDto } from './inicio-sesion.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RespuestaErrorDto } from '../../../compartido/documentacion/respuesta-error.dto';
import {
  RolSesionRespuestaDto,
  SesionRespuestaDto,
} from './sesion-respuesta.dto';
import {
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from './guard-autenticacion-jwt';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly iniciarSesion: IniciarSesion) {}

  @Get('sesion')
  @Header('Cache-Control', 'no-store')
  @UseGuards(GuardAutenticacionJwt)
  @ApiOperation({
    operationId: 'consultarSesion',
    summary: 'Consultar la sesión vigente',
    description:
      'Valida el JWT y devuelve el rol verificado. Disponible para OPERADOR y ADMINISTRADOR; respuesta no almacenable en caché.',
  })
  @ApiBearerAuth('sesion')
  @ApiOkResponse({
    type: RolSesionRespuestaDto,
    description: 'Rol de la sesión autenticada. Cache-Control: no-store.',
  })
  @ApiUnauthorizedResponse({
    type: RespuestaErrorDto,
    description: 'Falta el token Bearer, es inválido o está vencido.',
  })
  @ApiErrores({ protegido: false })
  consultarSesion(@Req() solicitud: SolicitudAutenticada) {
    if (!solicitud.usuario) throw new UnauthorizedException();
    return { rol: solicitud.usuario.rol.codigo };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: 'iniciarSesion',
    summary: 'Iniciar sesión',
    description:
      'Ruta pública. Devuelve token y rol; las credenciales incorrectas producen un mensaje genérico.',
  })
  @ApiBody({ type: InicioSesionDto })
  @ApiOkResponse({
    type: SesionRespuestaDto,
    description: 'Sesión emitida correctamente.',
  })
  @ApiUnauthorizedResponse({
    type: RespuestaErrorDto,
    description: 'Usuario o contraseña incorrectos.',
  })
  @ApiErrores({ protegido: false, cuerpo: true })
  async iniciar(@Body() dto: InicioSesionDto) {
    try {
      const { token, rol } = await this.iniciarSesion.ejecutar(
        dto.nombre,
        dto.contrasena,
      );
      return { token, rol: rol.codigo };
    } catch (error) {
      if (error instanceof CredencialesInvalidas) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CredencialesInvalidas,
  IniciarSesion,
} from '../aplicacion/iniciar-sesion';
import { InicioSesionDto } from './inicio-sesion.dto';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrores } from '../../../compartido/documentacion/api-errores';
import { RespuestaErrorDto } from '../../../compartido/documentacion/respuesta-error.dto';
import { SesionRespuestaDto } from './sesion-respuesta.dto';

@Controller('auth')
@ApiTags('Autenticación')
export class AuthController {
  constructor(private readonly iniciarSesion: IniciarSesion) {}

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

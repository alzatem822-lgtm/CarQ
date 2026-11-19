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
  GuardAutenticacionJwt,
  type SolicitudAutenticada,
} from './guard-autenticacion-jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly iniciarSesion: IniciarSesion) {}

  @Get('sesion')
  @Header('Cache-Control', 'no-store')
  @UseGuards(GuardAutenticacionJwt)
  consultarSesion(@Req() solicitud: SolicitudAutenticada) {
    if (!solicitud.usuario) throw new UnauthorizedException();
    return { rol: solicitud.usuario.rol.codigo };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
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

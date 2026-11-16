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

@Controller('auth')
export class AuthController {
  constructor(private readonly iniciarSesion: IniciarSesion) {}

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
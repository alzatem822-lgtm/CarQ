import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { EmisorTokens, PayloadToken } from '../aplicacion/emisor-tokens';

export interface SolicitudAutenticada {
  headers: Record<string, string | string[] | undefined>;
  usuario?: PayloadToken;
}

@Injectable()
export class GuardAutenticacionJwt implements CanActivate {
  constructor(private readonly emisor: EmisorTokens) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();
    const token = this.extraerToken(solicitud.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }
    try {
      solicitud.usuario = await this.emisor.verificar(token);
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }
    return true;
  }

  private extraerToken(cabecera: string | string[] | undefined): string | null {
    if (typeof cabecera !== 'string') {
      return null;
    }
    const [esquema, token] = cabecera.split(' ');
    return esquema === 'Bearer' && token ? token : null;
  }
}
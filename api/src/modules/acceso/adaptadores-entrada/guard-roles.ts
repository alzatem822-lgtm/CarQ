import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../dominio/rol';
import { CLAVE_ROLES } from './decorador-roles';
import { SolicitudAutenticada } from './guard-autenticacion-jwt';

@Injectable()
export class GuardRoles implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      CLAVE_ROLES,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!permitidos || permitidos.length === 0) {
      return true;
    }

    const solicitud = contexto
      .switchToHttp()
      .getRequest<SolicitudAutenticada>();
    const usuario = solicitud.usuario;
    if (!usuario) {
      throw new UnauthorizedException('Falta el token de autenticación');
    }
    if (!permitidos.some((rol) => rol.equals(usuario.rol))) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
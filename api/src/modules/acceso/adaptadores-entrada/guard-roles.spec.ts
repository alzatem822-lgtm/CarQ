import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../dominio/rol';
import { RolesPermitidos } from './decorador-roles';
import { SolicitudAutenticada } from './guard-autenticacion-jwt';
import { GuardRoles } from './guard-roles';

class ControladorDePrueba {
  @RolesPermitidos(Rol.ADMINISTRADOR)
  soloAdministrador(): void {}

  @RolesPermitidos(Rol.OPERADOR, Rol.ADMINISTRADOR)
  cualquierRol(): void {}

  sinRestriccion(): void {}
}

function contextoPara(
  metodo: () => void,
  solicitud: SolicitudAutenticada,
): ExecutionContext {
  return {
    getHandler: () => metodo,
    getClass: () => ControladorDePrueba,
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;
}

function solicitudDe(rol?: Rol): SolicitudAutenticada {
  return rol
    ? { headers: {}, usuario: { nombre: 'prueba', rol } }
    : { headers: {} };
}

describe('GuardRoles', () => {
  const guard = new GuardRoles(new Reflector());
  const controlador = new ControladorDePrueba();

  it('permite el acceso si el rol está permitido', () => {
    const contexto = contextoPara(
      controlador.soloAdministrador,
      solicitudDe(Rol.ADMINISTRADOR),
    );

    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('responde 403 si el rol no está permitido', () => {
    const contexto = contextoPara(
      controlador.soloAdministrador,
      solicitudDe(Rol.OPERADOR),
    );

    expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
  });

  it('permite cualquiera de los roles declarados', () => {
    const contexto = contextoPara(
      controlador.cualquierRol,
      solicitudDe(Rol.OPERADOR),
    );

    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('deja pasar si la ruta no declara roles', () => {
    const contexto = contextoPara(
      controlador.sinRestriccion,
      solicitudDe(Rol.OPERADOR),
    );

    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('responde 401 si no hay usuario autenticado en la petición', () => {
    const contexto = contextoPara(
      controlador.soloAdministrador,
      solicitudDe(),
    );

    expect(() => guard.canActivate(contexto)).toThrow(UnauthorizedException);
  });
});
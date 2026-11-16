import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EmisorTokens, PayloadToken } from '../aplicacion/emisor-tokens';
import { Rol } from '../dominio/rol';
import {
  GuardAutenticacionJwt,
  SolicitudAutenticada,
} from './guard-autenticacion-jwt';

class EmisorFalso extends EmisorTokens {
  async emitir(payload: PayloadToken): Promise<string> {
    return `token:${payload.nombre}`;
  }
  async verificar(token: string): Promise<PayloadToken> {
    if (token !== 'token-valido') {
      throw new Error('Token inválido o vencido');
    }
    return { nombre: 'admin', rol: Rol.ADMINISTRADOR };
  }
}

function contextoCon(solicitud: SolicitudAutenticada): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;
}

describe('GuardAutenticacionJwt', () => {
  const guard = new GuardAutenticacionJwt(new EmisorFalso());

  it('responde 401 si no hay token', async () => {
    const contexto = contextoCon({ headers: {} });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 401 si la cabecera no es Bearer', async () => {
    const contexto = contextoCon({
      headers: { authorization: 'Basic token-valido' },
    });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 401 si el token es inválido o vencido', async () => {
    const contexto = contextoCon({
      headers: { authorization: 'Bearer token-malo' },
    });

    await expect(guard.canActivate(contexto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('deja pasar y guarda el usuario en la petición si el token es válido', async () => {
    const solicitud: SolicitudAutenticada = {
      headers: { authorization: 'Bearer token-valido' },
    };

    const permitido = await guard.canActivate(contextoCon(solicitud));

    expect(permitido).toBe(true);
    expect(solicitud.usuario?.nombre).toBe('admin');
    expect(solicitud.usuario?.rol.equals(Rol.ADMINISTRADOR)).toBe(true);
  });
});
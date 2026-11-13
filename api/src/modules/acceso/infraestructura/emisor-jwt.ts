import jwt, { SignOptions } from 'jsonwebtoken';
import { EmisorTokens, PayloadToken } from '../aplicacion/emisor-tokens';
import { Rol } from '../dominio/rol';

export class EmisorJwt extends EmisorTokens {
  constructor(
    private readonly secreto: string,
    private readonly expiracion: string,
  ) {
    super();
  }

  emitir(payload: PayloadToken): Promise<string> {
    const opciones: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.expiracion as SignOptions['expiresIn'],
      subject: payload.nombre,
    };
    const token = jwt.sign({ rol: payload.rol.codigo }, this.secreto, opciones);
    return Promise.resolve(token);
  }

  verificar(token: string): Promise<PayloadToken> {
    try {
      const decodificado = jwt.verify(token, this.secreto, {
        algorithms: ['HS256'],
      });
      const codigoRol: unknown =
        typeof decodificado === 'string' ? undefined : decodificado.rol;
      if (
        typeof decodificado === 'string' ||
        !decodificado.sub ||
        typeof codigoRol !== 'string'
      ) {
        throw new Error('Token sin usuario o rol');
      }
      return Promise.resolve({
        nombre: decodificado.sub,
        rol: Rol.desde(codigoRol),
      });
    } catch {
      return Promise.reject(new Error('Token inválido o vencido'));
    }
  }
}
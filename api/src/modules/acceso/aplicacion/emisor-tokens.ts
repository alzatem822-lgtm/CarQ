import { Rol } from '../dominio/rol';

export interface PayloadToken {
  nombre: string;
  rol: Rol;
}

export abstract class EmisorTokens {
  abstract emitir(payload: PayloadToken): Promise<string>;
  abstract verificar(token: string): Promise<PayloadToken>;
}
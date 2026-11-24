import { compare, hash } from 'bcryptjs';
import { HasheadorContrasena } from '../aplicacion/hasheador-contrasena';

const RONDAS_COSTO = 10;

export class HasheadorBcrypt extends HasheadorContrasena {
  hash(contrasena: string): Promise<string> {
    return hash(contrasena, RONDAS_COSTO);
  }

  comparar(contrasena: string, hashGuardado: string): Promise<boolean> {
    return compare(contrasena, hashGuardado);
  }
}
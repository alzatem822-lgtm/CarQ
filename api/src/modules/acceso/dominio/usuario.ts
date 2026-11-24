import { Rol } from './rol';

export class Usuario {
  private constructor(
    readonly nombre: string,
    readonly hashContrasena: string,
    readonly rol: Rol,
  ) {}

  static crear(nombre: string, hashContrasena: string, rol: Rol): Usuario {
    if (!nombre?.trim()) {
      throw new Error('El usuario necesita un nombre');
    }
    if (!hashContrasena) {
      throw new Error('El usuario necesita un hash de contraseña');
    }
    if (!(rol instanceof Rol)) {
      throw new Error('El usuario necesita un rol válido');
    }
    return new Usuario(nombre.trim(), hashContrasena, rol);
  }
}
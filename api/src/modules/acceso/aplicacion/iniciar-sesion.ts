import { UsuarioRepository } from './usuario.repository';
import { HasheadorContrasena } from './hasheador-contrasena';
import { EmisorTokens } from './emisor-tokens';
import { Rol } from '../dominio/rol';

export interface ResultadoInicioSesion {
  readonly token: string;
  readonly rol: Rol;
}

export class CredencialesInvalidas extends Error {
  constructor() {
    super('Credenciales inválidas');
    this.name = 'CredencialesInvalidas';
  }
}

export class IniciarSesion {
  constructor(
    private readonly usuarios: UsuarioRepository,
    private readonly hasheador: HasheadorContrasena,
    private readonly emisor: EmisorTokens,
  ) {}

  async ejecutar(
    nombre: string,
    contrasena: string,
  ): Promise<ResultadoInicioSesion> {
    const usuario = await this.usuarios.obtenerPorNombre(nombre);
    if (!usuario) {
      throw new CredencialesInvalidas();
    }

    const coincide = await this.hasheador.comparar(
      contrasena,
      usuario.hashContrasena,
    );
    if (!coincide) {
      throw new CredencialesInvalidas();
    }

    const token = await this.emisor.emitir({
      nombre: usuario.nombre,
      rol: usuario.rol,
    });
    return { token, rol: usuario.rol };
  }
}
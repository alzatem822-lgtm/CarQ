import { Usuario } from '../dominio/usuario';

export abstract class UsuarioRepository {
  abstract obtenerPorNombre(nombre: string): Promise<Usuario | null>;
}
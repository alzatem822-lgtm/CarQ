import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UsuarioRepository } from '../aplicacion/usuario.repository';
import { Rol } from '../dominio/rol';
import { Usuario } from '../dominio/usuario';

interface FilaUsuario {
  nombre: string;
  hash_contrasena: string;
  rol: string;
}

@Injectable()
export class UsuarioPostgresRepository implements UsuarioRepository {
  constructor(private readonly origen: DataSource) {}

  async obtenerPorNombre(nombre: string): Promise<Usuario | null> {
    const filas: FilaUsuario[] = await this.origen.query(
      `SELECT nombre, hash_contrasena, rol FROM usuario WHERE nombre = $1`,
      [nombre],
    );
    if (filas.length === 0) {
      return null;
    }
    const fila = filas[0];
    return Usuario.crear(fila.nombre, fila.hash_contrasena, Rol.desde(fila.rol));
  }
}
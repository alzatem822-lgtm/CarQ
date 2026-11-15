import { DataSource } from 'typeorm';
import { HasheadorBcrypt } from '../../../modules/acceso/infraestructura/hasheador-bcrypt';
import { Rol } from '../../../modules/acceso/dominio/rol';

// Credenciales SOLO para desarrollo y pruebas. En la base se guarda el hash.
export const USUARIOS_DE_PRUEBA = [
  { nombre: 'operador', contrasena: 'operador123', rol: Rol.OPERADOR },
  { nombre: 'administrador', contrasena: 'administrador123', rol: Rol.ADMINISTRADOR },
];

export async function sembrarUsuarios(origen: DataSource): Promise<void> {
  const hasheador = new HasheadorBcrypt();
  for (const { nombre, contrasena, rol } of USUARIOS_DE_PRUEBA) {
    const hash = await hasheador.hash(contrasena);
    await origen.query(
      `INSERT INTO usuario (nombre, hash_contrasena, rol)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre) DO NOTHING`,
      [nombre, hash, rol.codigo],
    );
  }
}
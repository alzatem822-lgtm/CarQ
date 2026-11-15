import { DataSource } from 'typeorm';
import { Rol } from '../dominio/rol';
import { UsuarioPostgresRepository } from './usuario-postgres.repository';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

const NOMBRE_USUARIO = 'usuario-prueba-repositorio';
const HASH = 'hash-de-prueba';

describe('UsuarioPostgresRepository (integración)', () => {
  const origen = new DataSource({
    type: 'postgres',
    url: process.env.URL_BASE_DATOS_MIGRACIONES ?? process.env.URL_BASE_DATOS,
  });
  let repositorio: UsuarioPostgresRepository;

  beforeAll(async () => {
    await origen.initialize();
    repositorio = new UsuarioPostgresRepository(origen);
    await origen.query(
      `INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ($1, $2, $3)`,
      [NOMBRE_USUARIO, HASH, Rol.ADMINISTRADOR.codigo],
    );
  });

  afterAll(async () => {
    await origen.query(`DELETE FROM usuario WHERE nombre = $1`, [NOMBRE_USUARIO]);
    await origen.destroy();
  });

  it('devuelve el usuario por nombre', async () => {
    const usuario = await repositorio.obtenerPorNombre(NOMBRE_USUARIO);

    expect(usuario).not.toBeNull();
    expect(usuario?.nombre).toBe(NOMBRE_USUARIO);
    expect(usuario?.hashContrasena).toBe(HASH);
    expect(usuario?.rol.equals(Rol.ADMINISTRADOR)).toBe(true);
  });

  it('devuelve nulo si el usuario no existe', async () => {
    const usuario = await repositorio.obtenerPorNombre('nadie-con-este-nombre');

    expect(usuario).toBeNull();
  });
});
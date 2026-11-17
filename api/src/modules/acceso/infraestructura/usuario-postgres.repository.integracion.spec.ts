import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { Rol } from '../dominio/rol';
import { UsuarioPostgresRepository } from './usuario-postgres.repository';

const NOMBRE_USUARIO = 'usuario-prueba-repositorio';
const HASH = 'hash-de-prueba';

describe('UsuarioPostgresRepository (integración)', () => {
  let origen: DataSource;
  let repositorio: UsuarioPostgresRepository;

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    repositorio = new UsuarioPostgresRepository(origen);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    await origen.query(
      `INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ($1, $2, $3)`,
      [NOMBRE_USUARIO, HASH, Rol.ADMINISTRADOR.codigo],
    );
  });

  afterAll(async () => {
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
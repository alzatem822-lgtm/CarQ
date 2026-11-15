import { DataSource } from 'typeorm';
import { IniciarSesion } from '../../../modules/acceso/aplicacion/iniciar-sesion';
import { EmisorJwt } from '../../../modules/acceso/infraestructura/emisor-jwt';
import { HasheadorBcrypt } from '../../../modules/acceso/infraestructura/hasheador-bcrypt';
import { UsuarioPostgresRepository } from '../../../modules/acceso/infraestructura/usuario-postgres.repository';
import { USUARIOS_DE_PRUEBA, sembrarUsuarios } from './usuarios.seed';

try {
  process.loadEnvFile('../.env');
} catch {
  // sin .env: se usan las variables del entorno
}

describe('sembrarUsuarios (integración)', () => {
  const origen = new DataSource({
    type: 'postgres',
    url: process.env.URL_BASE_DATOS_MIGRACIONES ?? process.env.URL_BASE_DATOS,
  });
  let iniciarSesion: IniciarSesion;

  beforeAll(async () => {
    await origen.initialize();
    await sembrarUsuarios(origen);
    iniciarSesion = new IniciarSesion(
      new UsuarioPostgresRepository(origen),
      new HasheadorBcrypt(),
      new EmisorJwt('secreto-de-prueba', '1h'),
    );
  });

  afterAll(async () => {
    await origen.destroy();
  });

  it.each(USUARIOS_DE_PRUEBA)(
    'el usuario $nombre puede iniciar sesión con su rol',
    async ({ nombre, contrasena, rol }) => {
      const resultado = await iniciarSesion.ejecutar(nombre, contrasena);

      expect(resultado.token).toEqual(expect.any(String));
      expect(resultado.rol.equals(rol)).toBe(true);
    },
  );

  it('repetir el seed no duplica los usuarios', async () => {
    await sembrarUsuarios(origen);

    const [{ total }] = await origen.query(
      `SELECT COUNT(*)::int AS total FROM usuario WHERE nombre = ANY($1)`,
      [USUARIOS_DE_PRUEBA.map((u) => u.nombre)],
    );

    expect(total).toBe(USUARIOS_DE_PRUEBA.length);
  });
});
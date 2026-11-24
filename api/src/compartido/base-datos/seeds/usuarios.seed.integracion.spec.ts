import { DataSource } from 'typeorm';
import { IniciarSesion } from '../../../modules/acceso/aplicacion/iniciar-sesion';
import { EmisorJwt } from '../../../modules/acceso/infraestructura/emisor-jwt';
import { HasheadorBcrypt } from '../../../modules/acceso/infraestructura/hasheador-bcrypt';
import { UsuarioPostgresRepository } from '../../../modules/acceso/infraestructura/usuario-postgres.repository';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../pruebas/base-datos-pruebas';
import { USUARIOS_DE_PRUEBA, sembrarUsuarios } from './usuarios.seed';

describe('sembrarUsuarios (integración)', () => {
  let origen: DataSource;
  let iniciarSesion: IniciarSesion;

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    iniciarSesion = new IniciarSesion(
      new UsuarioPostgresRepository(origen),
      new HasheadorBcrypt(),
      new EmisorJwt('secreto-de-prueba', '1h'),
    );
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    await sembrarUsuarios(origen);
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
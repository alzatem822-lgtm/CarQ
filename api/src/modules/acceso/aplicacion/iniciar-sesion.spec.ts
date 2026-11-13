import { IniciarSesion, CredencialesInvalidas } from './iniciar-sesion';
import { UsuarioRepository } from './usuario.repository';
import { HasheadorContrasena } from './hasheador-contrasena';
import { EmisorTokens, PayloadToken } from './emisor-tokens';
import { Usuario } from '../dominio/usuario';
import { Rol } from '../dominio/rol';

class UsuariosEnMemoria extends UsuarioRepository {
  constructor(private readonly usuarios: Usuario[]) {
    super();
  }
  async obtenerPorNombre(nombre: string): Promise<Usuario | null> {
    return this.usuarios.find((u) => u.nombre === nombre) ?? null;
  }
}

class HasheadorFalso extends HasheadorContrasena {
  async hash(contrasena: string): Promise<string> {
    return `hash:${contrasena}`;
  }
  async comparar(contrasena: string, hash: string): Promise<boolean> {
    return hash === `hash:${contrasena}`;
  }
}

class EmisorFalso extends EmisorTokens {
  async emitir(payload: PayloadToken): Promise<string> {
    return `token:${payload.nombre}:${payload.rol.codigo}`;
  }
  async verificar(token: string): Promise<PayloadToken> {
    throw new Error(`no usado en esta prueba: ${token}`);
  }
}

describe('IniciarSesion', () => {
  const admin = Usuario.crear('admin', 'hash:secreta', Rol.ADMINISTRADOR);
  const casoDeUso = new IniciarSesion(
    new UsuariosEnMemoria([admin]),
    new HasheadorFalso(),
    new EmisorFalso(),
  );

  it('devuelve token y rol con credenciales válidas', async () => {
    const resultado = await casoDeUso.ejecutar('admin', 'secreta');
    expect(resultado.token).toBe('token:admin:ADMINISTRADOR');
    expect(resultado.rol.equals(Rol.ADMINISTRADOR)).toBe(true);
  });

  it('rechaza una contraseña incorrecta', async () => {
    await expect(casoDeUso.ejecutar('admin', 'mala')).rejects.toBeInstanceOf(
      CredencialesInvalidas,
    );
  });

  it('rechaza un usuario inexistente', async () => {
    await expect(casoDeUso.ejecutar('nadie', 'secreta')).rejects.toBeInstanceOf(
      CredencialesInvalidas,
    );
  });

  it('usa el mismo mensaje si falla el usuario o la contraseña', async () => {
    const porUsuario = await casoDeUso
      .ejecutar('nadie', 'secreta')
      .catch((e: Error) => e.message);
    const porContrasena = await casoDeUso
      .ejecutar('admin', 'mala')
      .catch((e: Error) => e.message);
    expect(porUsuario).toBe(porContrasena);
  });
});
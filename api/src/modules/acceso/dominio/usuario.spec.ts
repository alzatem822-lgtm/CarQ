import { Rol } from './rol';
import { Usuario } from './usuario';

describe('Usuario', () => {
  it('se crea con nombre, hash y rol válido', () => {
    const usuario = Usuario.crear('mariana', 'hash123', Rol.OPERADOR);
    expect(usuario.nombre).toBe('mariana');
    expect(usuario.rol).toBe(Rol.OPERADOR);
  });

  it('rechaza un usuario sin rol válido', () => {
    expect(() =>
      Usuario.crear('mariana', 'hash123', undefined as unknown as Rol),
    ).toThrow('rol válido');
  });

  it('rechaza un nombre vacío', () => {
    expect(() => Usuario.crear('  ', 'hash123', Rol.ADMINISTRADOR)).toThrow(
      'nombre',
    );
  });

  it('rechaza un hash vacío', () => {
    expect(() => Usuario.crear('mariana', '', Rol.OPERADOR)).toThrow('hash');
  });
});
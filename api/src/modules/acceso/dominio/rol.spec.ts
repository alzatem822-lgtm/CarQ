import { Rol } from './rol';

describe('Rol', () => {
  it('solo existen operador y administrador', () => {
    expect(Rol.OPERADOR.codigo).toBe('OPERADOR');
    expect(Rol.ADMINISTRADOR.codigo).toBe('ADMINISTRADOR');
  });

  it('resuelve un rol a partir de su código', () => {
    expect(Rol.desde('OPERADOR')).toBe(Rol.OPERADOR);
  });

  it('rechaza un rol desconocido', () => {
    expect(() => Rol.desde('SUPERUSUARIO')).toThrow('desconocido');
  });

  it('compara roles por código', () => {
    expect(Rol.OPERADOR.equals(Rol.OPERADOR)).toBe(true);
    expect(Rol.OPERADOR.equals(Rol.ADMINISTRADOR)).toBe(false);
  });
});
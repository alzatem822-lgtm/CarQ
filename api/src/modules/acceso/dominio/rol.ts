export class Rol {
  private static readonly registrados = new Map<string, Rol>();

  static readonly OPERADOR = Rol.registrar('OPERADOR');
  static readonly ADMINISTRADOR = Rol.registrar('ADMINISTRADOR');

  private constructor(readonly codigo: string) {}

  private static registrar(codigo: string): Rol {
    const rol = new Rol(codigo);
    Rol.registrados.set(codigo, rol);
    return rol;
  }

  static desde(codigo: string): Rol {
    const rol = Rol.registrados.get(codigo);
    if (!rol) {
      throw new Error(`Rol desconocido: ${codigo}`);
    }
    return rol;
  }

  equals(otro: Rol): boolean {
    return this.codigo === otro.codigo;
  }
}
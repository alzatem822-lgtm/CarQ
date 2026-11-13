export abstract class HasheadorContrasena {
  abstract hash(contrasena: string): Promise<string>;
  abstract comparar(contrasena: string, hash: string): Promise<boolean>;
}
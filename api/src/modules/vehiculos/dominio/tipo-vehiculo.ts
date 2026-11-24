export class TipoVehiculo {
  private static readonly registrados = new Map<string, TipoVehiculo>();

  static readonly CARRO = TipoVehiculo.registrar('CARRO');
  static readonly MOTO = TipoVehiculo.registrar('MOTO');

  private constructor(readonly codigo: string) {}

  private static registrar(codigo: string): TipoVehiculo {
    const tipo = new TipoVehiculo(codigo);
    TipoVehiculo.registrados.set(codigo, tipo);
    return tipo;
  }

  static desde(codigo: string): TipoVehiculo {
    const tipo = TipoVehiculo.registrados.get(codigo);
    if (!tipo) {
      throw new Error(`Tipo de vehículo desconocido: ${codigo}`);
    }
    return tipo;
  }

  equals(otro: TipoVehiculo): boolean {
    return this.codigo === otro.codigo;
  }
}
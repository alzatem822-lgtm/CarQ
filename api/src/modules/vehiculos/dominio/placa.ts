import { PlacaInvalidaError } from './placa-invalida.error';

export class Placa {
  private static readonly FORMATO_CARRO = /^[A-Z]{3}\d{3}$/;
  private static readonly FORMATO_MOTO = /^[A-Z]{3}\d{2}[A-Z]$/;

  private constructor(readonly valor: string) {}

  static crear(texto: string): Placa {
    const normalizada = texto.toUpperCase();
    if (
      !Placa.FORMATO_CARRO.test(normalizada) &&
      !Placa.FORMATO_MOTO.test(normalizada)
    ) {
      throw new PlacaInvalidaError(texto);
    }
    return new Placa(normalizada);
  }

  esFormatoCarro(): boolean {
    return Placa.FORMATO_CARRO.test(this.valor);
  }

  esFormatoMoto(): boolean {
    return Placa.FORMATO_MOTO.test(this.valor);
  }
}
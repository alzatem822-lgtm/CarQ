import { ErrorDominio } from '../../../compartido/errores/error-dominio';

export class UmbralConfianza {
  private constructor(readonly valor: number) {}

  static crear(valor: number): UmbralConfianza {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 1) {
      throw new ErrorDominio(
        'UMBRAL_INVALIDO',
        'El umbral de confianza debe estar entre 0 y 1',
      );
    }
    return new UmbralConfianza(valor);
  }
}
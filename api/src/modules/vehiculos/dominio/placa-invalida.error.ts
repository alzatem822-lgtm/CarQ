export class PlacaInvalidaError extends Error {
  constructor(texto: string) {
    super(`Formato de placa inválido: ${texto}`);
    this.name = 'PlacaInvalidaError';
  }
}
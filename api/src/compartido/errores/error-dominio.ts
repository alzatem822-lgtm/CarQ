export class ErrorDominio extends Error {
  constructor(
    readonly codigo: string,
    readonly motivo: string,
  ) {
    super(motivo);
    this.name = 'ErrorDominio';
  }
}
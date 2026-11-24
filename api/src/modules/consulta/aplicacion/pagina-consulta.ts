export interface PaginacionConsulta {
  readonly pagina: number;
  readonly tamanioPagina: number;
}

export interface PaginaConsulta<T> {
  readonly elementos: readonly T[];
  readonly haySiguiente: boolean;
}

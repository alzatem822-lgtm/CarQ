export interface ValoresFiltros<T extends string> {
  readonly placa: string;
  readonly desde: string;
  readonly hasta: string;
  readonly estado: T | "";
}

export interface OpcionesFiltros<T extends string> {
  readonly etiqueta: string;
  readonly estados: ReadonlyArray<{ valor: T; texto: string }>;
  readonly indicacionFechas?: string;
}

export const FILTROS_VACIOS = {
  placa: "",
  desde: "",
  hasta: "",
  estado: "",
} as const;

import { peticion } from "./cliente-http";
import type { CobroCaja } from "./caja";
import type { ValoresFiltros } from "./filtros-consulta";

export interface PaginaConsulta<T> {
  readonly elementos: T[];
  readonly haySiguiente: boolean;
}

export type ResultadoEvento =
  "AUTORIZADO" | "RECHAZADO" | "REQUIERE_LECTURA_MANUAL";

export interface EventoConsulta {
  readonly id: number;
  readonly placa: string | null;
  readonly sentido: "ENTRADA" | "SALIDA";
  readonly origen: "SIMULADO" | "MANUAL" | "OCR";
  readonly resultado: ResultadoEvento;
  readonly motivo: string;
  readonly ocurridoEn: string;
}

export const ZONA_EVENTOS = "America/Bogota";
const DURACION_DIA_MS = 86_400_000;
const DIFERENCIA_HORARIA_COLOMBIA = "-05:00";

function inicioDia(fecha: string) {
  return new Date(`${fecha}T00:00:00${DIFERENCIA_HORARIA_COLOMBIA}`).getTime();
}

export async function consultarEventos(
  filtros: ValoresFiltros<ResultadoEvento>,
  pagina: number,
  signal: AbortSignal,
): Promise<PaginaConsulta<EventoConsulta>> {
  const parametros = new URLSearchParams({ pagina: String(pagina) });
  if (filtros.placa) parametros.set("placa", filtros.placa);
  if (filtros.desde)
    parametros.set("desde", new Date(inicioDia(filtros.desde)).toISOString());
  if (filtros.hasta) {
    const hastaExclusivo = inicioDia(filtros.hasta) + DURACION_DIA_MS;
    parametros.set("hasta", new Date(hastaExclusivo).toISOString());
  }
  if (filtros.estado) parametros.set("resultado", filtros.estado);

  return peticion<PaginaConsulta<EventoConsulta>>(
    `/consulta/eventos?${parametros}`,
    { signal },
  );
}

export async function consultarCobros(
  filtros: ValoresFiltros<CobroCaja["estado"]>,
  pagina: number,
  signal: AbortSignal,
): Promise<PaginaConsulta<CobroCaja>> {
  const parametros = new URLSearchParams({ pagina: String(pagina) });
  if (filtros.placa) parametros.set("placa", filtros.placa);
  if (filtros.desde) parametros.set("desde", filtros.desde);
  if (filtros.hasta) parametros.set("hasta", filtros.hasta);
  if (filtros.estado) parametros.set("estado", filtros.estado);

  return peticion<PaginaConsulta<CobroCaja>>(`/consulta/cobros?${parametros}`, {
    signal,
  });
}

import type { Columna } from "@/componentes/interfaz/Tabla";
import {
  consultarEventos,
  ZONA_EVENTOS,
  type EventoConsulta,
  type ResultadoEvento,
} from "@/lib/consulta";
import type { OpcionesFiltros } from "@/lib/filtros-consulta";
import { ListadoConsulta } from "./ListadoConsulta";

const resultados = {
  AUTORIZADO: "Autorizado",
  RECHAZADO: "Rechazado",
  REQUIERE_LECTURA_MANUAL: "Requiere lectura manual",
} satisfies Record<ResultadoEvento, string>;

const opciones: OpcionesFiltros<ResultadoEvento> = {
  etiqueta: "Resultado",
  indicacionFechas: "Fechas de eventos en hora de Colombia.",
  estados: [
    { valor: "AUTORIZADO", texto: resultados.AUTORIZADO },
    { valor: "RECHAZADO", texto: resultados.RECHAZADO },
    {
      valor: "REQUIERE_LECTURA_MANUAL",
      texto: resultados.REQUIERE_LECTURA_MANUAL,
    },
  ],
};

const fecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: ZONA_EVENTOS,
});

const origen = { SIMULADO: "Simulado", MANUAL: "Manual", OCR: "OCR" };

const columnas: Columna<EventoConsulta>[] = [
  {
    encabezado: "Fecha",
    celda: (evento) => (
      <time dateTime={evento.ocurridoEn}>
        {fecha.format(new Date(evento.ocurridoEn))}
      </time>
    ),
  },
  { encabezado: "Placa", celda: (evento) => evento.placa ?? "Sin placa" },
  {
    encabezado: "Tipo",
    celda: (evento) => (evento.sentido === "ENTRADA" ? "Entrada" : "Salida"),
  },
  { encabezado: "Origen", celda: (evento) => origen[evento.origen] },
  { encabezado: "Resultado", celda: (evento) => resultados[evento.resultado] },
  { encabezado: "Motivo", celda: (evento) => evento.motivo },
];

export function EventosConsulta() {
  return (
    <ListadoConsulta
      titulo="Eventos"
      opciones={opciones}
      columnas={columnas}
      consultar={consultarEventos}
    />
  );
}

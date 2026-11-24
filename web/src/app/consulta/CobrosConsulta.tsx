import { InsigniaEstado } from "@/componentes/interfaz/InsigniaEstado";
import { ESTADOS, type ClaveEstado } from "@/componentes/interfaz/estados";
import type { Columna } from "@/componentes/interfaz/Tabla";
import { monedaCaja, type CobroCaja } from "@/lib/caja";
import { consultarCobros } from "@/lib/consulta";
import type { OpcionesFiltros } from "@/lib/filtros-consulta";
import { ListadoConsulta } from "./ListadoConsulta";

const estados: Record<CobroCaja["estado"], ClaveEstado> = {
  PENDIENTE: "cobroPendiente",
  PAGADO: "cobroPagado",
  ANULADO: "cobroAnulado",
};

const opciones: OpcionesFiltros<CobroCaja["estado"]> = {
  etiqueta: "Estado",
  estados: [
    { valor: "PENDIENTE", texto: ESTADOS.cobroPendiente.texto },
    { valor: "PAGADO", texto: ESTADOS.cobroPagado.texto },
    { valor: "ANULADO", texto: ESTADOS.cobroAnulado.texto },
  ],
};

const columnas: Columna<CobroCaja>[] = [
  {
    encabezado: "Día operativo",
    celda: (cobro) => (
      <time dateTime={cobro.diaOperativo}>{cobro.diaOperativo}</time>
    ),
  },
  { encabezado: "Placa", celda: (cobro) => cobro.placa },
  { encabezado: "Tipo", celda: (cobro) => cobro.tipoVehiculo },
  {
    encabezado: "Franja",
    celda: (cobro) => (cobro.franja === "DIURNA" ? "Diurna" : "Nocturna"),
  },
  {
    encabezado: "Tarifa aplicada",
    celda: (cobro) => monedaCaja.format(cobro.tarifaAplicada),
  },
  {
    encabezado: "Estado",
    celda: (cobro) => <InsigniaEstado estado={estados[cobro.estado]} />,
  },
];

export function CobrosConsulta() {
  return (
    <ListadoConsulta
      titulo="Cobros"
      opciones={opciones}
      columnas={columnas}
      consultar={consultarCobros}
    />
  );
}

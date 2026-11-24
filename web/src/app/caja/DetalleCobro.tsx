import type { ReactNode } from "react";
import { InsigniaEstado } from "@/componentes/interfaz/InsigniaEstado";
import { monedaCaja, type CobroCaja } from "@/lib/caja";
import estilos from "./Caja.module.css";

export function DetalleCobro({
  cobro,
  children,
}: {
  cobro: CobroCaja;
  children?: ReactNode;
}) {
  return (
    <section className={estilos.panel} aria-labelledby="titulo-detalle">
      <h2 id="titulo-detalle">Detalle del cobro</h2>
      <dl className={estilos.detalle}>
        <div>
          <dt>Placa</dt>
          <dd>{cobro.placa}</dd>
        </div>
        <div>
          <dt>Tipo de vehículo</dt>
          <dd>{cobro.tipoVehiculo === "CARRO" ? "Carro" : "Moto"}</dd>
        </div>
        <div>
          <dt>Día operativo</dt>
          <dd>{cobro.diaOperativo}</dd>
        </div>
        <div>
          <dt>Franja</dt>
          <dd>{cobro.franja === "DIURNA" ? "Diurna" : "Nocturna"}</dd>
        </div>
        <div>
          <dt>Tarifa aplicada</dt>
          <dd className={estilos.importe}>
            {monedaCaja.format(cobro.tarifaAplicada)}
          </dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <InsigniaEstado
              estado={
                cobro.estado === "PAGADO" ? "cobroPagado" : "cobroPendiente"
              }
            />
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}

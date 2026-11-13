import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { InsigniaEstado } from '@/componentes/interfaz/InsigniaEstado';

export default function CajaPage() {
  return (
    <>
      <h1>Caja</h1>
      <CampoFormulario etiqueta="Placa" name="placa" />
      <InsigniaEstado estado="cobroPendiente" />
      <Alerta>Busque una placa para ver su cobro.</Alerta>
    </>
  );
}
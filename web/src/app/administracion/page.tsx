import { Alerta } from '@/componentes/interfaz/Alerta';
import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';
import { InsigniaEstado } from '@/componentes/interfaz/InsigniaEstado';

export default function AdministracionPage() {
  return (
    <>
      <h1>Administración</h1>
      <CampoFormulario etiqueta="Cupo de carros" name="cupoCarros" type="number" />
      <InsigniaEstado estado="lleno" />
      <Alerta tono="advertencia">La tarifa nocturna debe ser menor que la diurna.</Alerta>
    </>
  );
}
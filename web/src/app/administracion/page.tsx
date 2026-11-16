import { FormularioCupos } from '@/componentes/administracion/FormularioCupos';
import { FormularioUmbral } from '@/componentes/administracion/FormularioUmbral';
import { SeccionAdministracion } from '@/componentes/administracion/SeccionAdministracion';
import { Alerta } from '@/componentes/interfaz/Alerta';

export default function AdministracionPage() {
  return (
    <>
      <h1>Administración</h1>
      <SeccionAdministracion titulo="Tarifas">
        <Alerta>Formulario de tarifas pendiente (CARQ-73).</Alerta>
      </SeccionAdministracion>
      <SeccionAdministracion titulo="Franja diurna">
        <Alerta>Formulario de franja pendiente (CARQ-74).</Alerta>
      </SeccionAdministracion>
      <SeccionAdministracion titulo="Cupos">
        <FormularioCupos />
      </SeccionAdministracion>
      <SeccionAdministracion titulo="Umbral de confianza">
        <FormularioUmbral />
      </SeccionAdministracion>
    </>
  );
}
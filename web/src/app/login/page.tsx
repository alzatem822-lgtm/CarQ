import { CampoFormulario } from '@/componentes/interfaz/CampoFormulario';

export default function LoginPage() {
  return (
    <>
      <h1>Login</h1>
      <CampoFormulario etiqueta="Usuario" name="usuario" />
      <CampoFormulario etiqueta="Contraseña" name="contrasena" type="password" />
    </>
  );
}
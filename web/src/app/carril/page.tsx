import { InsigniaEstado } from '@/componentes/interfaz/InsigniaEstado';

export default function CarrilPage() {
  return (
    <>
      <h1>Carril</h1>
      <InsigniaEstado estado="barreraCerrada" />
      <InsigniaEstado estado="lecturaManual" />
    </>
  );
}
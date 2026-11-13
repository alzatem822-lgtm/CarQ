import { Tabla, type Columna } from '@/componentes/interfaz/Tabla';
import { InsigniaEstado } from '@/componentes/interfaz/InsigniaEstado';
import type { ClaveEstado } from '@/componentes/interfaz/estados';

interface FilaCobro {
  placa: string;
  estado: ClaveEstado;
}

const COLUMNAS: Columna<FilaCobro>[] = [
  { encabezado: 'Placa', celda: (fila) => fila.placa },
  { encabezado: 'Estado', celda: (fila) => <InsigniaEstado estado={fila.estado} /> },
];

export default function ConsultaPage() {
  return (
    <>
      <h1>Consulta</h1>
      <Tabla
        columnas={COLUMNAS}
        filas={[]}
        clave={(fila) => fila.placa}
        mensajeVacio="Sin cobros registrados"
      />
    </>
  );
}
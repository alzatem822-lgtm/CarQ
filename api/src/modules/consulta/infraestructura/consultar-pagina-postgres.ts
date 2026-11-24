import type { DataSource } from 'typeorm';
import type {
  PaginaConsulta,
  PaginacionConsulta,
} from '../aplicacion/pagina-consulta';

type ValorFiltro = string | number | Date;
type FiltroSql = readonly [expresion: string, valor: ValorFiltro | undefined];

export async function consultarPaginaPostgres<T>(
  origen: Pick<DataSource, 'query'>,
  seleccion: string,
  orden: string,
  filtros: readonly FiltroSql[],
  paginacion: PaginacionConsulta,
): Promise<PaginaConsulta<T>> {
  const parametros: ValorFiltro[] = [];
  const condiciones: string[] = [];

  for (const [expresion, valor] of filtros) {
    if (valor !== undefined) {
      parametros.push(valor);
      condiciones.push(`${expresion} $${parametros.length}`);
    }
  }

  const { pagina, tamanioPagina } = paginacion;
  parametros.push(tamanioPagina + 1, (pagina - 1) * tamanioPagina);
  const filas = await origen.query<T[]>(
    `${seleccion}
     WHERE ${condiciones.join(' AND ')}
     ORDER BY ${orden}
     LIMIT $${parametros.length - 1} OFFSET $${parametros.length}`,
    parametros,
  );

  return {
    elementos: filas.slice(0, tamanioPagina),
    haySiguiente: filas.length > tamanioPagina,
  };
}

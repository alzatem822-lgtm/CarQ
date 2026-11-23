import type { DataSource } from 'typeorm';
import {
  ConsultaEventosRepository,
  type EventoConsultado,
  type FiltrosConsultaEventos,
} from '../aplicacion/consulta-eventos.repository';
import { consultarPaginaPostgres } from './consultar-pagina-postgres';

export class ConsultaEventosPostgresRepository extends ConsultaEventosRepository {
  constructor(private readonly origen: Pick<DataSource, 'query'>) {
    super();
  }

  consultar(filtros: FiltrosConsultaEventos) {
    return consultarPaginaPostgres<EventoConsultado>(
      this.origen,
      `SELECT id, carril_id AS "carrilId", placa, sentido, resultado, motivo,
              ocurrido_en AS "ocurridoEn"
       FROM evento`,
      'ocurrido_en DESC, id DESC',
      [
        ['sede_id =', filtros.sedeId],
        ['placa =', filtros.placa?.valor],
        ['ocurrido_en >=', filtros.desde],
        ['ocurrido_en <', filtros.hastaExclusivo],
        ['resultado =', filtros.resultado],
      ],
      filtros,
    );
  }
}

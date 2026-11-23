import type { DataSource } from 'typeorm';
import {
  ConsultaCobrosRepository,
  type CobroConsultado,
  type FiltrosConsultaCobros,
} from '../aplicacion/consulta-cobros.repository';
import { consultarPaginaPostgres } from './consultar-pagina-postgres';

export class ConsultaCobrosPostgresRepository extends ConsultaCobrosRepository {
  constructor(private readonly origen: Pick<DataSource, 'query'>) {
    super();
  }

  consultar(filtros: FiltrosConsultaCobros) {
    return consultarPaginaPostgres<CobroConsultado>(
      this.origen,
      `SELECT id, placa, tipo_vehiculo AS "tipoVehiculo",
              dia_operativo::text AS "diaOperativo", franja,
              tarifa_aplicada AS "tarifaAplicada", estado
       FROM cobro`,
      'dia_operativo DESC, id DESC',
      [
        ['sede_id =', filtros.sedeId],
        ['placa =', filtros.placa?.valor],
        ['dia_operativo >=', filtros.diaDesde],
        ['dia_operativo <=', filtros.diaHasta],
        ['estado =', filtros.estado],
      ],
      filtros,
    );
  }
}

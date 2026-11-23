import type { DataSource } from 'typeorm';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoFranja } from '../../configuracion/dominio/franja';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { CobroRepository } from '../aplicacion/cobro.repository';
import { Cobro } from '../dominio/cobro';
import { CodigoEstadoCobro } from '../dominio/estado-cobro';

interface FilaCobro {
  id: number;
  placa: string;
  tipo_vehiculo: string;
  sede_id: number;
  dia_operativo: string;
  franja: TipoFranja;
  tarifa_aplicada: number;
  estado: CodigoEstadoCobro;
  anulado_por: string | null;
  motivo_anulacion: string | null;
}

const columnas =
  'id, placa, tipo_vehiculo, sede_id, dia_operativo::text AS dia_operativo, franja, tarifa_aplicada, estado, anulado_por, motivo_anulacion';

export class CobroPostgresRepository extends CobroRepository {
  constructor(private readonly origen: Pick<DataSource, 'query'>) {
    super();
  }

  async buscarPorPlacaYDia(
    placa: Placa,
    sedeId: number,
    diaOperativo: string,
  ): Promise<Cobro | null> {
    return this.buscarUno(
      `SELECT ${columnas} FROM cobro WHERE placa = $1 AND sede_id = $2 AND dia_operativo = $3`,
      [placa.valor, sedeId, diaOperativo],
    );
  }

  async listarPendientes(
    placa: Placa,
    sedeId: number,
    hastaDia: string,
  ): Promise<Cobro[]> {
    const filas: FilaCobro[] = await this.origen.query(
      `SELECT ${columnas} FROM cobro
       WHERE placa = $1 AND sede_id = $2 AND estado = 'PENDIENTE' AND dia_operativo <= $3
       ORDER BY dia_operativo, id`,
      [placa.valor, sedeId, hastaDia],
    );
    return filas.map(aCobro);
  }

  buscarPorId(id: number, sedeId: number): Promise<Cobro | null> {
    return this.buscarUno(
      `SELECT ${columnas} FROM cobro WHERE id = $1 AND sede_id = $2`,
      [id, sedeId],
    );
  }

  bloquearPorId(id: number, sedeId: number): Promise<Cobro | null> {
    return this.buscarUno(
      `SELECT ${columnas} FROM cobro WHERE id = $1 AND sede_id = $2 FOR UPDATE`,
      [id, sedeId],
    );
  }

  async guardar(cobro: Cobro): Promise<Cobro> {
    const [fila]: FilaCobro[] = await this.origen.query(
      `INSERT INTO cobro (placa, tipo_vehiculo, sede_id, dia_operativo, franja, tarifa_aplicada)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ON CONSTRAINT uq_cobro_placa_sede_dia DO NOTHING
       RETURNING ${columnas}`,
      [
        cobro.placa.valor,
        cobro.tipoVehiculo.codigo,
        cobro.sedeId,
        cobro.diaOperativo,
        cobro.franja,
        cobro.tarifaAplicada,
      ],
    );
    if (!fila) {
      throw new ErrorDominio(
        'COBRO_DUPLICADO',
        'Ya existe un cobro para la placa en el día operativo.',
      );
    }
    return aCobro(fila);
  }

  actualizarEstado(
    cobro: Cobro,
    esperado: CodigoEstadoCobro,
  ): Promise<Cobro | null> {
    return this.buscarUno(
      `WITH actualizado AS (
         UPDATE cobro SET estado = $1, anulado_por = $2, motivo_anulacion = $3
         WHERE id = $4 AND sede_id = $5 AND estado = $6 RETURNING *
       ) SELECT ${columnas} FROM actualizado`,
      [
        cobro.estado,
        cobro.anuladoPor,
        cobro.motivoAnulacion,
        cobro.id,
        cobro.sedeId,
        esperado,
      ],
    );
  }

  private async buscarUno(
    sql: string,
    parametros: unknown[],
  ): Promise<Cobro | null> {
    const [fila]: FilaCobro[] = await this.origen.query(sql, parametros);
    return fila ? aCobro(fila) : null;
  }
}

function aCobro(fila: FilaCobro): Cobro {
  return Cobro.reconstruir({
    id: fila.id,
    placa: Placa.crear(fila.placa),
    tipoVehiculo: TipoVehiculo.desde(fila.tipo_vehiculo),
    sedeId: fila.sede_id,
    diaOperativo: fila.dia_operativo,
    franja: fila.franja,
    tarifaAplicada: fila.tarifa_aplicada,
    estado: fila.estado,
    anuladoPor: fila.anulado_por,
    motivoAnulacion: fila.motivo_anulacion,
  });
}

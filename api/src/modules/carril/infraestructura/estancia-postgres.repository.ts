import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { EstanciaRepository } from '../aplicacion/estancia.repository';
import { Estancia } from '../dominio/estancia';

interface FilaEstancia {
  id: number;
  placa: string;
  sede_id: number;
  carril_id: number;
  tipo_vehiculo: string;
  ingreso_en: Date;
  salida_en: Date | null;
}

const COLUMNAS =
  'id, placa, sede_id, carril_id, tipo_vehiculo, ingreso_en, salida_en';

@Injectable()
export class EstanciaPostgresRepository implements EstanciaRepository {
  constructor(private readonly origen: Pick<DataSource, 'query'>) {}

  async abrir(estancia: Estancia): Promise<Estancia> {
    const [fila]: FilaEstancia[] = await this.origen.query(
      `INSERT INTO estancia (placa, sede_id, carril_id, tipo_vehiculo, ingreso_en)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUMNAS}`,
      [
        estancia.placa.valor,
        estancia.sedeId,
        estancia.carrilId,
        estancia.tipoVehiculo.codigo,
        estancia.ingresoEn,
      ],
    );
    return this.aEntidad(fila);
  }

  async cerrar(id: number, salidaEn: Date): Promise<Estancia | null> {
    // El UPDATE va dentro de un WITH para que el driver devuelva las filas.
    const filas: FilaEstancia[] = await this.origen.query(
      `WITH cerrada AS (
         UPDATE estancia SET salida_en = $2
         WHERE id = $1 AND salida_en IS NULL
         RETURNING ${COLUMNAS}
       )
       SELECT ${COLUMNAS} FROM cerrada`,
      [id, salidaEn],
    );
    return filas.length > 0 ? this.aEntidad(filas[0]) : null;
  }

  async buscarAbiertaPorPlaca(
    placa: Placa,
    sedeId: number,
  ): Promise<Estancia | null> {
    const filas: FilaEstancia[] = await this.origen.query(
      `SELECT ${COLUMNAS} FROM estancia
       WHERE placa = $1 AND sede_id = $2 AND salida_en IS NULL`,
      [placa.valor, sedeId],
    );
    return filas.length > 0 ? this.aEntidad(filas[0]) : null;
  }

  async contarAbiertasPorTipo(
    sedeId: number,
    tipoVehiculo: TipoVehiculo,
  ): Promise<number> {
    const [fila]: { total: number }[] = await this.origen.query(
      `SELECT COUNT(*)::int AS total FROM estancia
       WHERE sede_id = $1 AND tipo_vehiculo = $2 AND salida_en IS NULL`,
      [sedeId, tipoVehiculo.codigo],
    );
    return fila.total;
  }

  private aEntidad(fila: FilaEstancia): Estancia {
    return Estancia.reconstruir({
      id: fila.id,
      placa: Placa.crear(fila.placa),
      sedeId: fila.sede_id,
      carrilId: fila.carril_id,
      tipoVehiculo: TipoVehiculo.desde(fila.tipo_vehiculo),
      ingresoEn: fila.ingreso_en,
      salidaEn: fila.salida_en,
    });
  }
}

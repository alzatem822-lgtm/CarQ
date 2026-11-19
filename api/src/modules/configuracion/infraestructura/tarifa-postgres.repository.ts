import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { TarifaRepository } from '../aplicacion/tarifa.repository';
import { TipoFranja } from '../dominio/franja';
import { Tarifa } from '../dominio/tarifa';

interface FilaTarifa {
  sede_id: number;
  tipo_vehiculo: string;
  franja: string;
  valor: number;
}

const UNICIDAD = '23505';
const RESTRICCION_CHECK = '23514';

@Injectable()
export class TarifaPostgresRepository implements TarifaRepository {
  constructor(private readonly origen: DataSource) {}

  async obtenerTodas(sedeId?: string): Promise<Tarifa[]> {
    const filas: FilaTarifa[] = await this.origen.query(
      `SELECT sede_id, tipo_vehiculo, franja, valor
         FROM tarifa
         WHERE ($1::integer IS NULL OR sede_id = $1::integer)
        ORDER BY sede_id, tipo_vehiculo, franja`,
      [sedeId ?? null],
    );
    return filas.map((fila) =>
      Tarifa.crear(
        String(fila.sede_id),
        TipoVehiculo.desde(fila.tipo_vehiculo),
        fila.franja as TipoFranja,
        fila.valor,
      ),
    );
  }

  async guardarTodas(tarifas: Tarifa[]): Promise<void> {
    try {
      await this.origen.transaction(async (gestor) => {
        // Serializa cambios de distintas franjas para que RN-02 pueda ver
        // las tarifas confirmadas por la transacción anterior de la sede.
        const sedes = [
          ...new Set(tarifas.map((tarifa) => Number(tarifa.sedeId))),
        ];
        await gestor.query(
          'SELECT id FROM sede WHERE id = ANY($1::integer[]) ORDER BY id FOR NO KEY UPDATE',
          [sedes],
        );
        for (const tarifa of tarifas) {
          await gestor.query(
            `INSERT INTO tarifa (sede_id, tipo_vehiculo, franja, valor)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (sede_id, tipo_vehiculo, franja)
             DO UPDATE SET valor = EXCLUDED.valor`,
            [
              Number(tarifa.sedeId),
              tarifa.tipoVehiculo.codigo,
              tarifa.franja,
              tarifa.valor,
            ],
          );
        }
      });
    } catch (error) {
      const codigo = codigoPostgres(error);
      if (codigo === UNICIDAD) {
        throw new ErrorDominio(
          'TARIFA_DUPLICADA',
          'Ya existe una tarifa para ese tipo y franja',
        );
      }
      if (codigo === RESTRICCION_CHECK) {
        throw new ErrorDominio(
          'TARIFA_INVALIDA',
          'La tarifa nocturna debe ser menor que la diurna',
        );
      }
      throw error;
    }
  }
}

function codigoPostgres(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const directo = (error as { code?: unknown }).code;
  const interno = (error as { driverError?: { code?: unknown } }).driverError
    ?.code;
  const codigo = directo ?? interno;
  return typeof codigo === 'string' ? codigo : undefined;
}

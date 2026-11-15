import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { CupoRepository } from '../aplicacion/cupo.repository';
import { Cupo } from '../dominio/cupo';

interface FilaCupo {
  sede_id: number;
  tipo: string;
  maximo: number;
}

@Injectable()
export class CupoPostgresRepository implements CupoRepository {
  constructor(private readonly origen: DataSource) {}

  async obtenerTodos(): Promise<Cupo[]> {
    const filas: FilaCupo[] = await this.origen.query(
      `SELECT sede_id, tipo, maximo FROM cupo ORDER BY sede_id, tipo`,
    );
    return filas.map((fila) =>
      Cupo.crear(String(fila.sede_id), TipoVehiculo.desde(fila.tipo), fila.maximo),
    );
  }

  async guardarTodos(cupos: Cupo[]): Promise<void> {
    await this.origen.transaction(async (manager) => {
      for (const cupo of cupos) {
        await manager.query(
          `INSERT INTO cupo (sede_id, tipo, maximo) VALUES ($1, $2, $3)
           ON CONFLICT (sede_id, tipo) DO UPDATE SET maximo = EXCLUDED.maximo`,
          [Number(cupo.sedeId), cupo.tipoVehiculo.codigo, cupo.maximo],
        );
      }
    });
  }
}
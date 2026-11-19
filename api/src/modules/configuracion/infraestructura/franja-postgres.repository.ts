import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FranjaRepository } from '../aplicacion/franja.repository';
import { Franja } from '../dominio/franja';

interface FilaFranja {
  inicio_hora: number;
  fin_hora: number;
}

@Injectable()
export class FranjaPostgresRepository implements FranjaRepository {
  constructor(private readonly origen: DataSource) {}

  async obtener(): Promise<Franja> {
    const filas: FilaFranja[] = await this.origen.query(
      `SELECT inicio_hora, fin_hora FROM franja
       WHERE sede_id = (SELECT id FROM sede ORDER BY id LIMIT 1)`,
    );
    if (filas.length === 0) {
      throw new Error('No hay una franja configurada');
    }
    return Franja.diurna(filas[0].inicio_hora, filas[0].fin_hora);
  }

  async guardar(franja: Franja): Promise<void> {
    await this.origen.query(
      `INSERT INTO franja (sede_id, inicio_hora, fin_hora)
       SELECT id, $1::integer, $2::integer FROM sede ORDER BY id LIMIT 1
       ON CONFLICT (sede_id)
       DO UPDATE SET inicio_hora = EXCLUDED.inicio_hora,
                     fin_hora = EXCLUDED.fin_hora`,
      [franja.inicioHora, franja.finHora],
    );
  }
}

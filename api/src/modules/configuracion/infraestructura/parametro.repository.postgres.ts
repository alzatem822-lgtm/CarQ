import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ParametroRepository } from '../aplicacion/parametro.repository';
import { UmbralConfianza } from '../dominio/umbral-confianza';

interface FilaUmbral {
  umbral_confianza: string;
}

/**
 * CARQ-67. Adaptador PostgreSQL del puerto ParametroRepository.
 *
 * El puerto no recibe la sede porque hoy hay una sola; el adaptador usa
 * esa sede (la de menor id). NUMERIC llega como string desde el
 * controlador de PostgreSQL, así que se convierte a número y se pasa por
 * UmbralConfianza, que vuelve a validar el rango (0 a 1).
 */
@Injectable()
export class ParametroRepositoryPostgres implements ParametroRepository {
  constructor(private readonly origenDatos: DataSource) {}

  /** Devuelve el umbral de la sede. Falla si no existe (falta el seed). */
  async obtenerUmbral(): Promise<UmbralConfianza> {
    const filas: FilaUmbral[] = await this.origenDatos.query(
      `SELECT umbral_confianza
         FROM parametro_sede
        WHERE sede_id = (SELECT id FROM sede ORDER BY id LIMIT 1)`,
    );
    if (filas.length === 0) {
      throw new Error(
        'No hay umbral de confianza configurado para la sede; falta ejecutar el seed',
      );
    }
    return UmbralConfianza.crear(Number(filas[0].umbral_confianza));
  }

  /** Crea o reemplaza el umbral de la sede. */
  async guardarUmbral(umbral: UmbralConfianza): Promise<void> {
    await this.origenDatos.query(
      `INSERT INTO parametro_sede (sede_id, umbral_confianza)
       SELECT id, $1::numeric FROM sede ORDER BY id LIMIT 1
       ON CONFLICT (sede_id)
       DO UPDATE SET umbral_confianza = EXCLUDED.umbral_confianza`,
      [umbral.valor],
    );
  }
}
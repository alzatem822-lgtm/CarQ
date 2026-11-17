import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventoRepository } from '../aplicacion/evento.repository';
import { Evento } from '../dominio/evento';

@Injectable()
export class EventoPostgresRepository implements EventoRepository {
  constructor(private readonly origen: DataSource) {}

  async registrar(evento: Evento): Promise<void> {
    await this.origen.query(
      `INSERT INTO evento
         (sede_id, carril_id, placa, sentido, resultado, motivo,
          confianza, origen, lectura_manual, ocurrido_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        Number(evento.sedeId),
        Number(evento.carrilId),
        evento.placa?.valor ?? null,
        evento.sentido,
        evento.resultado,
        evento.motivo,
        evento.confianza,
        evento.origen,
        evento.lecturaManual,
        evento.ocurridoEn,
      ],
    );
  }
}
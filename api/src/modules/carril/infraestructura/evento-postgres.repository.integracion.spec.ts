import { DataSource } from 'typeorm';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from '../../../compartido/pruebas/base-datos-pruebas';
import { Placa } from '../../vehiculos/dominio/placa';
import { Evento } from '../dominio/evento';
import { EventoPostgresRepository } from './evento-postgres.repository';

describe('EventoPostgresRepository (integración)', () => {
  let origen: DataSource;
  let repositorio: EventoPostgresRepository;
  let sedeId: string;
  let carrilId: string;

  beforeAll(async () => {
    origen = await iniciarBaseDatosPruebas();
    repositorio = new EventoPostgresRepository(origen);
  }, 30000);

  beforeEach(async () => {
    await limpiarBaseDatosPruebas(origen);
    const [sede] = await origen.query(
      `INSERT INTO sede (nombre) VALUES ($1) RETURNING id`,
      ['Sede prueba eventos'],
    );
    sedeId = String(sede.id);
    const [carril] = await origen.query(
      `INSERT INTO carril (sede_id, nombre) VALUES ($1, $2) RETURNING id`,
      [sede.id, 'Carril prueba eventos'],
    );
    carrilId = String(carril.id);
    await origen.query(
      "INSERT INTO usuario (nombre, hash_contrasena, rol) VALUES ('operador-eventos', 'hash-prueba', 'OPERADOR')",
    );
  });

  afterAll(async () => {
    await origen.destroy();
  });

  it('guarda un evento con sus datos', async () => {
    const ocurridoEn = new Date('2026-11-17T15:30:00.000Z');

    await repositorio.registrar(
      Evento.crear({
        sedeId,
        carrilId,
        placa: Placa.crear('ABC123'),
        sentido: 'ENTRADA',
        resultado: 'AUTORIZADO',
        motivo: 'Ingreso autorizado',
        confianza: 0.93,
        origen: 'OCR',
        lecturaManual: false,
        ocurridoEn,
      }),
    );

    const filas = await origen.query(`SELECT * FROM evento`);

    expect(filas).toHaveLength(1);
    expect(filas[0].sede_id).toBe(Number(sedeId));
    expect(filas[0].carril_id).toBe(Number(carrilId));
    expect(filas[0].placa).toBe('ABC123');
    expect(filas[0].sentido).toBe('ENTRADA');
    expect(filas[0].resultado).toBe('AUTORIZADO');
    expect(filas[0].motivo).toBe('Ingreso autorizado');
    expect(filas[0].confianza).toBeCloseTo(0.93);
    expect(filas[0].origen).toBe('OCR');
    expect(filas[0].lectura_manual).toBe(false);
    expect(filas[0].operador).toBeNull();
    expect(new Date(filas[0].ocurrido_en).getTime()).toBe(ocurridoEn.getTime());
  });

  it('guarda un rechazo sin placa ni confianza y marca la lectura manual', async () => {
    await repositorio.registrar(
      Evento.crear({
        sedeId,
        carrilId,
        placa: null,
        sentido: 'SALIDA',
        resultado: 'REQUIERE_LECTURA_MANUAL',
        motivo: 'No se detectó placa',
        confianza: null,
        origen: 'MANUAL',
        lecturaManual: true,
        operador: 'operador-eventos',
        ocurridoEn: new Date('2026-11-17T20:00:00.000Z'),
      }),
    );

    const filas = await origen.query(`SELECT * FROM evento`);

    expect(filas).toHaveLength(1);
    expect(filas[0].placa).toBeNull();
    expect(filas[0].confianza).toBeNull();
    expect(filas[0].origen).toBe('MANUAL');
    expect(filas[0].lectura_manual).toBe(true);
    expect(filas[0].operador).toBe('operador-eventos');
    expect(filas[0].resultado).toBe('REQUIERE_LECTURA_MANUAL');
  });
});

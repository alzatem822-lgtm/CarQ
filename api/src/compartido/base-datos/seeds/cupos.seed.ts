import { DataSource } from 'typeorm';

const NOMBRE_SEDE = 'Sede principal';
const CUPOS_INICIALES = [
  { tipo: 'CARRO', maximo: 3 },
  { tipo: 'MOTO', maximo: 5 },
];

export async function sembrarCupos(origen: DataSource): Promise<void> {
  for (const { tipo, maximo } of CUPOS_INICIALES) {
    await origen.query(
      `INSERT INTO cupo (sede_id, tipo, maximo)
       SELECT id, $2, $3 FROM sede WHERE nombre = $1
       ON CONFLICT (sede_id, tipo) DO NOTHING`,
      [NOMBRE_SEDE, tipo, maximo],
    );
  }
}
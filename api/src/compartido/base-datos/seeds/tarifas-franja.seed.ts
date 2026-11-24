import { DataSource } from 'typeorm';

const NOMBRE_SEDE = 'Sede principal';
const FRANJA_DIURNA = { inicioHora: 6, finHora: 18 };

// Valores provisionales: se acuerdan con Santiago (CARQ-55).
const TARIFAS_INICIALES = [
  { tipo: 'CARRO', franja: 'DIURNA', valor: 5000 },
  { tipo: 'CARRO', franja: 'NOCTURNA', valor: 3000 },
  { tipo: 'MOTO', franja: 'DIURNA', valor: 0 },
  { tipo: 'MOTO', franja: 'NOCTURNA', valor: 0 },
];

export async function sembrarTarifasYFranja(origen: DataSource): Promise<void> {
  await origen.query(
    `INSERT INTO franja (sede_id, inicio_hora, fin_hora)
     SELECT id, $2::integer, $3::integer FROM sede WHERE nombre = $1
     ON CONFLICT (sede_id) DO NOTHING`,
    [NOMBRE_SEDE, FRANJA_DIURNA.inicioHora, FRANJA_DIURNA.finHora],
  );

  for (const { tipo, franja, valor } of TARIFAS_INICIALES) {
    await origen.query(
      `INSERT INTO tarifa (sede_id, tipo_vehiculo, franja, valor)
       SELECT id, $2, $3, $4::integer FROM sede WHERE nombre = $1
       ON CONFLICT (sede_id, tipo_vehiculo, franja) DO NOTHING`,
      [NOMBRE_SEDE, tipo, franja, valor],
    );
  }
}
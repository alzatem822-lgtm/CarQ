import { DataSource } from 'typeorm';

const NOMBRE_SEDE = 'Sede principal';
// Valor provisional: se fija con el banco de imagenes del OCR (CONTEXTO, seccion 6).
const UMBRAL_INICIAL = 0.8;

export async function sembrarUmbral(origen: DataSource): Promise<void> {
  await origen.query(
    `INSERT INTO parametro_sede (sede_id, umbral_confianza)
     SELECT id, $2 FROM sede WHERE nombre = $1
     ON CONFLICT (sede_id) DO NOTHING`,
    [NOMBRE_SEDE, UMBRAL_INICIAL],
  );
}
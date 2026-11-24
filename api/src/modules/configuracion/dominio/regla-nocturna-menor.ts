import { Tarifa } from './tarifa';

export function validarNocturnaMenorQueDiurna(tarifas: Tarifa[]): void {
  const grupos = new Map<string, { diurna?: number; nocturna?: number }>();

  for (const tarifa of tarifas) {
    const clave = `${tarifa.sedeId}:${tarifa.tipoVehiculo.codigo}`;
    const grupo = grupos.get(clave) ?? {};
    if (tarifa.franja === 'DIURNA') {
      grupo.diurna = tarifa.valor;
    } else {
      grupo.nocturna = tarifa.valor;
    }
    grupos.set(clave, grupo);
  }

  for (const [clave, { diurna, nocturna }] of grupos) {
    if (diurna === undefined || nocturna === undefined) continue;
    if (diurna === 0 && nocturna === 0) continue;
    if (nocturna >= diurna) {
      throw new Error(
        `La tarifa nocturna debe ser menor que la diurna (${clave})`,
      );
    }
  }
}
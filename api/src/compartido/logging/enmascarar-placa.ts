const CARACTERES_VISIBLES = 3;

export function enmascararPlaca(placa: string): string {
  if (placa.length <= CARACTERES_VISIBLES) {
    return '*'.repeat(placa.length);
  }
  const oculta = '*'.repeat(placa.length - CARACTERES_VISIBLES);
  return oculta + placa.slice(-CARACTERES_VISIBLES);
}
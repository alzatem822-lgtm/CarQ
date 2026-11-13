export const ESTADOS = {
  barreraAbierta: { texto: 'Barrera abierta', tono: 'exito' },
  barreraCerrada: { texto: 'Barrera cerrada', tono: 'neutro' },
  cobroPendiente: { texto: 'Cobro pendiente', tono: 'advertencia' },
  lleno: { texto: 'LLENO', tono: 'peligro' },
  lecturaManual: { texto: 'Lectura manual', tono: 'informacion' },
} as const;

export type ClaveEstado = keyof typeof ESTADOS;
export type Tono = (typeof ESTADOS)[ClaveEstado]['tono'];
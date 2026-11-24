import type { Type } from '@nestjs/common';
import { ConditionalModule } from '@nestjs/config';

/** Registra rutas de simulación después de cargar el entorno centralizado. */
export function registrarConSensorSimulado(modulo: Type<unknown>) {
  return ConditionalModule.registerWhen(
    modulo,
    (entorno) => entorno.FUENTE_SENSOR?.trim() === 'simulado',
    { debug: false },
  );
}

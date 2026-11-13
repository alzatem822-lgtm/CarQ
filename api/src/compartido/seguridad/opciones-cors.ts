import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function crearOpcionesCors(urlWeb: string): CorsOptions {
  return {
    origin: (origen, devolver) => {
      devolver(null, origen === undefined || origen === urlWeb);
    },
  };
}
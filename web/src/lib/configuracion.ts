import { peticion } from './cliente-http';

export interface CupoConfigurado {
  readonly tipoVehiculo: string;
  readonly maximo: number;
}

export interface RespuestaCupos {
  readonly cupos: CupoConfigurado[];
}

export function consultarCupos(): Promise<RespuestaCupos> {
  return peticion<RespuestaCupos>('/configuracion/cupos');
}

export function guardarCupos(
  cupos: CupoConfigurado[],
): Promise<RespuestaCupos> {
  return peticion<RespuestaCupos>('/configuracion/cupos', {
    method: 'PUT',
    body: JSON.stringify({ cupos }),
  });
}

export interface RespuestaUmbral {
  readonly umbral: number;
}

export function consultarUmbral(): Promise<RespuestaUmbral> {
  return peticion<RespuestaUmbral>('/configuracion/umbral');
}

export function guardarUmbral(umbral: number): Promise<RespuestaUmbral> {
  return peticion<RespuestaUmbral>('/configuracion/umbral', {
    method: 'PUT',
    body: JSON.stringify({ umbral }),
  });
}
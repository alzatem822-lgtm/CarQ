import { peticion } from './cliente-http';
export interface CupoConfigurado { readonly tipoVehiculo: string; readonly maximo: number }
export interface RespuestaCupos { readonly cupos: CupoConfigurado[] }
export interface RespuestaUmbral { readonly umbral: number }
export interface TarifaConfigurada { tipoVehiculo: string; franja: 'DIURNA' | 'NOCTURNA'; valor: number }
export interface Horario { inicioHora: number; finHora: number }
export interface RespuestaTarifas { tarifas: TarifaConfigurada[]; franja: Horario }
export const consultarCupos = () => peticion<RespuestaCupos>('/configuracion/cupos');
export const guardarCupos = (cupos: CupoConfigurado[]) => peticion<RespuestaCupos>('/configuracion/cupos', { method: 'PUT', body: JSON.stringify({ cupos }) });
export const consultarUmbral = () => peticion<RespuestaUmbral>('/configuracion/umbral');
export const guardarUmbral = (umbral: number) => peticion<RespuestaUmbral>('/configuracion/umbral', { method: 'PUT', body: JSON.stringify({ umbral }) });
export const consultarTarifas = () => peticion<RespuestaTarifas>('/configuracion/tarifas');
export const guardarTarifas = (tarifas: TarifaConfigurada[]) => peticion<RespuestaTarifas>('/configuracion/tarifas', { method: 'PUT', body: JSON.stringify({ tarifas }) });
export const guardarFranja = (franja: Horario) => peticion<Horario>('/configuracion/franja', { method: 'PUT', body: JSON.stringify(franja) });

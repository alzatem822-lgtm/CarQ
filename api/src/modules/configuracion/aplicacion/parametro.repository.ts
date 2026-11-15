import { UmbralConfianza } from '../dominio/umbral-confianza';

export abstract class ParametroRepository {
  abstract obtenerUmbral(): Promise<UmbralConfianza>;
  abstract guardarUmbral(umbral: UmbralConfianza): Promise<void>;
}
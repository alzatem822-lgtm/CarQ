import { Franja } from '../dominio/franja';

export abstract class FranjaRepository {
  abstract obtener(): Promise<Franja>;
  abstract guardar(franja: Franja): Promise<void>;
}
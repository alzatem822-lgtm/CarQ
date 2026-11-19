import { Franja } from '../dominio/franja';

export abstract class FranjaRepository {
  abstract obtener(sedeId?: string): Promise<Franja>;
  abstract guardar(franja: Franja): Promise<void>;
}

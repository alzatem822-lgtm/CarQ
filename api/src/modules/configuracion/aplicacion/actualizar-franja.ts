import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { Franja } from '../dominio/franja';
import { FranjaRepository } from './franja.repository';

export class ActualizarFranja {
  constructor(private readonly franja: FranjaRepository) {}

  async ejecutar(inicioHora: number, finHora: number): Promise<void> {
    let nueva: Franja;
    try {
      nueva = Franja.diurna(inicioHora, finHora);
    } catch (error) {
      throw new ErrorDominio('FRANJA_INVALIDA', (error as Error).message);
    }
    await this.franja.guardar(nueva);
  }
}
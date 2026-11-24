import { UmbralConfianza } from '../dominio/umbral-confianza';
import { ConsultarUmbral } from './consultar-umbral';
import { ParametroRepositoryEnMemoria } from './parametro.repository.en-memoria';

describe('ConsultarUmbral', () => {
  it('devuelve el umbral vigente', async () => {
    const vigente = UmbralConfianza.crear(0.85);
    const consultar = new ConsultarUmbral(
      new ParametroRepositoryEnMemoria(vigente),
    );

    const resultado = await consultar.ejecutar();

    expect(resultado).toEqual(vigente);
  });
});
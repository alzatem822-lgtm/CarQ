import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Franja } from '../dominio/franja';
import { Tarifa } from '../dominio/tarifa';
import { ConsultarConfiguracionTarifas } from './consultar-configuracion-tarifas';
import { FranjaRepository } from './franja.repository';
import { TarifaRepository } from './tarifa.repository';

class TarifasEnMemoria extends TarifaRepository {
  constructor(private readonly tarifas: Tarifa[]) {
    super();
  }
  async obtenerTodas(): Promise<Tarifa[]> {
    return this.tarifas;
  }
  async guardarTodas(): Promise<void> {}
}

class FranjaEnMemoria extends FranjaRepository {
  constructor(private readonly franja: Franja) {
    super();
  }
  async obtener(): Promise<Franja> {
    return this.franja;
  }
  async guardar(): Promise<void> {}
}

describe('ConsultarConfiguracionTarifas', () => {
  const tarifas = [
    Tarifa.crear('1', TipoVehiculo.CARRO, 'DIURNA', 5000),
    Tarifa.crear('1', TipoVehiculo.CARRO, 'NOCTURNA', 3000),
    Tarifa.crear('1', TipoVehiculo.MOTO, 'DIURNA', 0),
    Tarifa.crear('1', TipoVehiculo.MOTO, 'NOCTURNA', 0),
  ];
  const franja = Franja.diurna(6, 18);

  it('devuelve las tarifas y la franja vigentes', async () => {
    const casoDeUso = new ConsultarConfiguracionTarifas(
      new TarifasEnMemoria(tarifas),
      new FranjaEnMemoria(franja),
    );

    const configuracion = await casoDeUso.ejecutar();

    expect(configuracion.tarifas).toEqual(tarifas);
    expect(configuracion.franja.inicioHora).toBe(6);
    expect(configuracion.franja.finHora).toBe(18);
  });
});
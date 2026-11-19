import { RelojFijo } from '../../../compartido/reloj/reloj-fijo';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Cobro } from '../dominio/cobro';
import { ConsultarPaseVigente } from './consultar-pase-vigente';

describe('ConsultarPaseVigente', () => {
  const placa = Placa.crear('ABC123');
  const diaOperativo = '2026-11-19';
  const sedeId = 1;
  const dias = new DiaOperativo();
  const venceEn = dias.fin(diaOperativo);
  const pago = Cobro.reconstruir({
    id: 2,
    placa,
    sedeId,
    diaOperativo,
    estado: 'PAGADO',
    tipoVehiculo: TipoVehiculo.CARRO,
    franja: 'DIURNA',
    tarifaAplicada: 5000,
    anuladoPor: null,
    motivoAnulacion: null,
  });

  function preparar() {
    const consultar = jest.fn();
    const buscar = jest.fn();
    const reloj = new RelojFijo(new Date('2026-11-19T15:00:00Z'));
    const caso = new ConsultarPaseVigente(
      { consultar, guardar: jest.fn() },
      {
        buscarPorPlacaYDia: buscar,
        listarPendientes: jest.fn(),
        buscarPorId: jest.fn(),
        guardar: jest.fn(),
        actualizarEstado: jest.fn(),
      },
      dias,
      reloj,
    );
    return { consultar, buscar, caso, reloj };
  }

  it('devuelve el pase de Redis sin consultar la base', async () => {
    const { consultar, buscar, caso } = preparar();
    const pase = {
      placa,
      sedeId,
      diaOperativo,
      venceEn,
      cobroId: 2,
      pagoId: 3,
    };
    consultar.mockResolvedValue(pase);
    await expect(caso.ejecutar(placa, sedeId)).resolves.toEqual(pase);
    expect(buscar).not.toHaveBeenCalled();
  });

  it('lee el cobro pagado cuando Redis no está disponible', async () => {
    const { consultar, buscar, caso } = preparar();
    consultar.mockRejectedValue(new Error('Redis fuera de servicio'));
    buscar.mockResolvedValue(pago);
    await expect(caso.ejecutar(placa, sedeId)).resolves.toMatchObject({
      cobroId: 2,
      venceEn,
    });
    expect(buscar).toHaveBeenCalledWith(placa, sedeId, diaOperativo);
  });

  it('rechaza un pase de otra sede o vencido al cambiar de día operativo', async () => {
    const { consultar, buscar, caso, reloj } = preparar();
    consultar.mockResolvedValue({
      placa,
      sedeId: 2,
      diaOperativo,
      venceEn,
      cobroId: 2,
    });
    buscar.mockResolvedValue(null);
    await expect(caso.ejecutar(placa, sedeId)).resolves.toBeNull();
    reloj.fijar(venceEn);
    await expect(caso.ejecutar(placa, 2)).resolves.toBeNull();
    expect(buscar).toHaveBeenLastCalledWith(placa, 2, '2026-11-20');
  });

  it('no trata un cobro pendiente como pase', async () => {
    const { consultar, buscar, caso } = preparar();
    consultar.mockResolvedValue(null);
    buscar.mockResolvedValue({ id: 2, estado: 'PENDIENTE' });
    await expect(caso.ejecutar(placa, sedeId)).resolves.toBeNull();
  });
});

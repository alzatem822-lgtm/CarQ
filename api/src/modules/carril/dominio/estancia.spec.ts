import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { Estancia } from './estancia';

describe('Estancia', () => {
  const ingresoEn = new Date('2026-11-16T14:00:00Z');
  const datosBase = {
    placa: Placa.crear('ABC123'),
    sedeId: 1,
    carrilId: 1,
    tipoVehiculo: TipoVehiculo.CARRO,
    ingresoEn,
  };

  it('una estancia abierta tiene salida nula', () => {
    const estancia = Estancia.abrir(datosBase);

    expect(estancia.salidaEn).toBeNull();
    expect(estancia.estaAbierta()).toBe(true);
  });

  it('al abrir conserva los datos y aún no tiene id', () => {
    const estancia = Estancia.abrir(datosBase);

    expect(estancia.id).toBeNull();
    expect(estancia.placa.valor).toBe('ABC123');
    expect(estancia.tipoVehiculo.equals(TipoVehiculo.CARRO)).toBe(true);
    expect(estancia.ingresoEn).toEqual(ingresoEn);
  });

  it('una estancia reconstruida con salida no está abierta', () => {
    const estancia = Estancia.reconstruir({
      ...datosBase,
      id: 7,
      salidaEn: new Date('2026-11-16T16:00:00Z'),
    });

    expect(estancia.id).toBe(7);
    expect(estancia.estaAbierta()).toBe(false);
  });
});
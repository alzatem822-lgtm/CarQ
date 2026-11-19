import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { TipoFranja } from '../../configuracion/dominio/franja';
import { Placa } from '../../vehiculos/dominio/placa';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';

export type CodigoEstadoCobro = 'PENDIENTE' | 'PAGADO' | 'ANULADO';

export interface DatosCobro {
  id: number | null;
  placa: Placa;
  tipoVehiculo: TipoVehiculo;
  sedeId: number;
  diaOperativo: string;
  franja: TipoFranja;
  tarifaAplicada: number;
  estado: CodigoEstadoCobro;
  anuladoPor: string | null;
  motivoAnulacion: string | null;
}

type NuevoCobro = Omit<
  DatosCobro,
  'id' | 'estado' | 'anuladoPor' | 'motivoAnulacion'
>;

export class Cobro {
  private constructor(private readonly datos: Readonly<DatosCobro>) {}

  static crear(datos: NuevoCobro): Cobro {
    return Cobro.reconstruir({
      ...datos,
      id: null,
      estado: 'PENDIENTE',
      anuladoPor: null,
      motivoAnulacion: null,
    });
  }

  static reconstruir(datos: DatosCobro): Cobro {
    const dia = new Date(`${datos.diaOperativo}T00:00:00.000Z`);
    if (
      !Number.isInteger(datos.tarifaAplicada) ||
      datos.tarifaAplicada < 1 ||
      datos.tarifaAplicada > 2147483647 ||
      !Number.isSafeInteger(datos.sedeId) ||
      datos.sedeId < 1 ||
      !Number.isFinite(dia.getTime()) ||
      dia.toISOString().slice(0, 10) !== datos.diaOperativo
    ) {
      throw new ErrorDominio(
        'COBRO_INVALIDO',
        'Los datos del cobro son inválidos.',
      );
    }
    return new Cobro({ ...datos });
  }

  get id() {
    return this.datos.id;
  }
  get placa() {
    return this.datos.placa;
  }
  get tipoVehiculo() {
    return this.datos.tipoVehiculo;
  }
  get sedeId() {
    return this.datos.sedeId;
  }
  get diaOperativo() {
    return this.datos.diaOperativo;
  }
  get franja() {
    return this.datos.franja;
  }
  get tarifaAplicada() {
    return this.datos.tarifaAplicada;
  }
  get estado() {
    return this.datos.estado;
  }
  get anuladoPor() {
    return this.datos.anuladoPor;
  }
  get motivoAnulacion() {
    return this.datos.motivoAnulacion;
  }
}

import { Body, Controller, Get, Inject, Put, UseGuards } from '@nestjs/common';
import { RolesPermitidos } from '../../acceso/adaptadores-entrada/decorador-roles';
import { GuardAutenticacionJwt } from '../../acceso/adaptadores-entrada/guard-autenticacion-jwt';
import { GuardRoles } from '../../acceso/adaptadores-entrada/guard-roles';
import { Rol } from '../../acceso/dominio/rol';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ActualizarFranja } from '../aplicacion/actualizar-franja';
import { ActualizarTarifas } from '../aplicacion/actualizar-tarifas';
import { ConsultarConfiguracionTarifas } from '../aplicacion/consultar-configuracion-tarifas';
import { FranjaRepository } from '../aplicacion/franja.repository';
import { Tarifa } from '../dominio/tarifa';
import { ActualizarFranjaDto } from './actualizar-franja.dto';
import { ActualizarTarifasDto } from './actualizar-tarifas.dto';

@Controller('configuracion')
@UseGuards(GuardAutenticacionJwt, GuardRoles)
@RolesPermitidos(Rol.ADMINISTRADOR)
export class TarifasController {
  constructor(
    private readonly consultar: ConsultarConfiguracionTarifas,
    private readonly actualizar: ActualizarTarifas,
    private readonly actualizarFranja: ActualizarFranja,
    private readonly franjas: FranjaRepository,
    @Inject('ResolverSedeConfiguracion')
    private readonly resolverSede: () => Promise<string>,
  ) {}
  @Get('tarifas')
  async obtener() {
    return this.consultarSede(await this.resolverSede());
  }

  private async consultarSede(sedeId: string) {
    const datos = await this.consultar.ejecutar(sedeId);
    return {
      tarifas: datos.tarifas.map((t) => ({
        tipoVehiculo: t.tipoVehiculo.codigo,
        franja: t.franja,
        valor: t.valor,
      })),
      franja: {
        inicioHora: datos.franja.inicioHora,
        finHora: datos.franja.finHora,
      },
    };
  }
  @Put('tarifas')
  async guardar(@Body() dto: ActualizarTarifasDto) {
    const sede = await this.resolverSede();
    await this.actualizar.ejecutar(
      dto.tarifas.map((t) =>
        Tarifa.crear(
          sede,
          TipoVehiculo.desde(t.tipoVehiculo),
          t.franja,
          t.valor,
        ),
      ),
    );
    return this.consultarSede(sede);
  }
  @Put('franja')
  async guardarFranja(@Body() dto: ActualizarFranjaDto) {
    await this.actualizarFranja.ejecutar(dto.inicioHora, dto.finHora);
    const franja = await this.franjas.obtener();
    return { inicioHora: franja.inicioHora, finHora: franja.finHora };
  }
}

import { DataSource } from 'typeorm';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { ConsultarPaseVigente } from '../../cobros/aplicacion/consultar-pase-vigente';
import { GenerarCobro } from '../../cobros/aplicacion/generar-cobro';
import { PaseVigenteRepository } from '../../cobros/aplicacion/pase-vigente.repository';
import { RegistroEstrategiasTarifa } from '../../cobros/dominio/estrategia-tarifa';
import {
  tarifaCarro,
  tarifaMoto,
} from '../../cobros/dominio/tarifa-por-franja';
import { CobroPostgresRepository } from '../../cobros/infraestructura/cobro-postgres.repository';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { FranjaPostgresRepository } from '../../configuracion/infraestructura/franja-postgres.repository';
import { TarifaPostgresRepository } from '../../configuracion/infraestructura/tarifa-postgres.repository';
import { ClasificadorVehiculo } from '../../vehiculos/dominio/clasificador-vehiculo';
import { RequiereValidacionManual } from '../../vehiculos/dominio/requiere-validacion-manual';
import { EvaluarCobroSalida } from '../aplicacion/evaluar-cobro-salida';
import {
  TransaccionSalida,
  type SolicitudSalida,
  type ResultadoSalida,
} from '../aplicacion/transaccion-salida';
import { Evento } from '../dominio/evento';
import { EstanciaPostgresRepository } from './estancia-postgres.repository';
import { EventoPostgresRepository } from './evento-postgres.repository';

/** Comparte el bloqueo de sede con ingreso y confirma la salida antes de abrir. */
export class TransaccionSalidaPostgres extends TransaccionSalida {
  constructor(
    private readonly origen: DataSource,
    private readonly dias: DiaOperativo,
    private readonly horario: ResolverFranja,
    private readonly pases: PaseVigenteRepository,
  ) {
    super();
  }

  ejecutar(solicitud: SolicitudSalida): Promise<ResultadoSalida> {
    return this.origen.transaction(async (gestor) => {
      const { sedeId, carrilId, lectura, ocurridoEn, operador } = solicitud;
      const sedes: { id: number }[] = await gestor.query(
        'SELECT id FROM sede WHERE id = $1 FOR NO KEY UPDATE',
        [sedeId],
      );
      const carriles: { id: number }[] = await gestor.query(
        'SELECT id FROM carril WHERE id = $1 AND sede_id = $2',
        [carrilId, sedeId],
      );
      if (!sedes.length || !carriles.length)
        throw new ErrorDominio(
          'CARRIL_NO_CONFIGURADO',
          'No existe el carril en la sede',
        );
      const [parametro]: { umbral_confianza: string }[] = await gestor.query(
        'SELECT umbral_confianza FROM parametro_sede WHERE sede_id = $1',
        [sedeId],
      );
      if (!parametro)
        throw new ErrorDominio(
          'UMBRAL_NO_CONFIGURADO',
          'No hay umbral configurado',
        );
      const estancias = new EstanciaPostgresRepository(gestor);
      let resultado: ResultadoSalida;
      if (
        new RequiereValidacionManual().evaluar(
          lectura,
          UmbralConfianza.crear(Number(parametro.umbral_confianza)),
        )
      ) {
        resultado = {
          resultado: 'REQUIERE_LECTURA_MANUAL',
          motivo: 'Se requiere validación manual',
        };
      } else {
        const placa = lectura.placa!;
        const tipo = new ClasificadorVehiculo().clasificar(placa);
        await gestor.query(
          'SELECT id FROM estancia WHERE placa = $1 AND sede_id = $2 AND salida_en IS NULL FOR UPDATE',
          [placa.valor, sedeId],
        );
        const estancia = await estancias.buscarAbiertaPorPlaca(placa, sedeId);
        if (!estancia) {
          resultado = {
            resultado: 'RECHAZADO',
            motivo: 'Sin ingreso registrado',
          };
        } else {
          if (estancia.ingresoEn > ocurridoEn)
            throw new ErrorDominio(
              'SALIDA_ANTERIOR_INGRESO',
              'La salida no puede ser anterior al ingreso',
            );
          if (!tipo.equals(estancia.tipoVehiculo))
            throw new ErrorDominio(
              'ESTANCIA_TIPO_INVALIDO',
              'El tipo de la estancia no corresponde a la placa',
            );
          const dia = this.dias.de(ocurridoEn);
          // Los pagos concurrentes esperan estos bloqueos hasta confirmar el evento.
          await gestor.query(
            'SELECT id FROM cobro WHERE placa = $1 AND sede_id = $2 AND dia_operativo <= $3 ORDER BY id FOR UPDATE',
            [placa.valor, sedeId, dia],
          );
          const cobros = new CobroPostgresRepository(gestor);
          const generar = new GenerarCobro(
            cobros,
            new FranjaPostgresRepository(gestor),
            new TarifaPostgresRepository(gestor),
            this.dias,
            this.horario,
            new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]),
          );
          const decision = await new EvaluarCobroSalida(
            this.dias,
            cobros,
            generar,
          ).ejecutar(estancia, ocurridoEn);
          // El cache nunca sustituye la evaluación de todos los cobros exigibles.
          const cobroActual = decision.autoriza
            ? await cobros.buscarPorPlacaYDia(placa, sedeId, dia)
            : null;
          if (cobroActual?.estado === 'PAGADO') {
            const consultar = new ConsultarPaseVigente(
              this.pases,
              cobros,
              this.dias,
              { ahora: () => new Date(ocurridoEn) },
            );
            if (!(await consultar.ejecutar(placa, sedeId)))
              throw new ErrorDominio(
                'PASE_NO_VIGENTE',
                'No se pudo confirmar la vigencia del pago',
              );
          }
          if (decision.autoriza) {
            if (
              estancia.id === null ||
              !(await estancias.cerrar(estancia.id, ocurridoEn))
            )
              throw new ErrorDominio(
                'ESTANCIA_NO_DISPONIBLE',
                'La estancia ya no está abierta',
              );
          }
          resultado = {
            resultado: decision.autoriza ? 'AUTORIZADO' : 'RECHAZADO',
            motivo: decision.motivo,
          };
        }
      }
      await new EventoPostgresRepository(gestor).registrar(
        Evento.crear({
          sedeId: String(sedeId),
          carrilId: String(carrilId),
          placa: lectura.placa,
          sentido: 'SALIDA',
          ...resultado,
          confianza:
            Number.isFinite(lectura.confianza) &&
            lectura.confianza >= 0 &&
            lectura.confianza <= 1
              ? lectura.confianza
              : null,
          origen: lectura.origen,
          lecturaManual: lectura.origen === 'MANUAL',
          operador,
          ocurridoEn,
        }),
      );
      return resultado;
    });
  }
}

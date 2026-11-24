import { DataSource } from 'typeorm';
import { DiaOperativo } from '../../../compartido/tiempo/dia-operativo';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { GenerarCobro } from '../../cobros/aplicacion/generar-cobro';
import { CobroPostgresRepository } from '../../cobros/infraestructura/cobro-postgres.repository';
import { RegistroEstrategiasTarifa } from '../../cobros/dominio/estrategia-tarifa';
import {
  tarifaCarro,
  tarifaMoto,
} from '../../cobros/dominio/tarifa-por-franja';
import { Cupo } from '../../configuracion/dominio/cupo';
import { UmbralConfianza } from '../../configuracion/dominio/umbral-confianza';
import { ResolverFranja } from '../../configuracion/dominio/resolver-franja';
import { TarifaPostgresRepository } from '../../configuracion/infraestructura/tarifa-postgres.repository';
import { FranjaPostgresRepository } from '../../configuracion/infraestructura/franja-postgres.repository';
import { ClasificadorVehiculo } from '../../vehiculos/dominio/clasificador-vehiculo';
import {
  TransaccionIngreso,
  type SolicitudIngreso,
  type ResultadoIngreso,
} from '../aplicacion/transaccion-ingreso';
import {
  CadenaValidacionesIngreso,
  ValidarLecturaIngreso,
  ValidarCupoIngreso,
} from '../dominio/cadena-validaciones-ingreso';
import { Evento } from '../dominio/evento';
import { Estancia } from '../dominio/estancia';
import { EstanciaPostgresRepository } from './estancia-postgres.repository';
import { EventoPostgresRepository } from './evento-postgres.repository';

/** El bloqueo de sede protege el último cupo y la admisión concurrente de placas. */
export class TransaccionIngresoPostgres extends TransaccionIngreso {
  constructor(
    private readonly origen: DataSource,
    private readonly dias: DiaOperativo,
    private readonly horario: ResolverFranja,
  ) {
    super();
  }

  ejecutar(solicitud: SolicitudIngreso): Promise<ResultadoIngreso> {
    return this.origen.transaction(async (gestor) => {
      const { sedeId, carrilId, lectura, ocurridoEn } = solicitud;
      const sedes: { id: number }[] = await gestor.query(
        'SELECT id FROM sede WHERE id = $1 FOR UPDATE',
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
      const eventos = new EventoPostgresRepository(gestor);
      const clasificador = new ClasificadorVehiculo();
      const cadena = new CadenaValidacionesIngreso([
        new ValidarLecturaIngreso(),
        new ValidarCupoIngreso(),
      ]);
      let resultado: ResultadoIngreso | null = await cadena.evaluar({
        lectura,
        umbral: UmbralConfianza.crear(Number(parametro.umbral_confianza)),
        consultarCupo: async () => {
          const tipo = clasificador.clasificar(lectura.placa!);
          const [fila]: { maximo: number }[] = await gestor.query(
            'SELECT maximo FROM cupo WHERE sede_id = $1 AND tipo = $2 FOR UPDATE',
            [sedeId, tipo.codigo],
          );
          if (!fila)
            throw new ErrorDominio(
              'CUPO_NO_CONFIGURADO',
              'No hay capacidad configurada para el tipo',
            );
          return {
            cupo: Cupo.crear(String(sedeId), tipo, fila.maximo),
            ocupacion: await estancias.contarAbiertasPorTipo(sedeId, tipo),
          };
        },
      });
      if (
        lectura.placa &&
        resultado?.resultado !== 'REQUIERE_LECTURA_MANUAL' &&
        (await estancias.buscarAbiertaPorPlaca(lectura.placa, sedeId))
      ) {
        resultado = { resultado: 'RECHAZADO', motivo: 'Ingreso ya registrado' };
      }
      if (!resultado) {
        const placa = lectura.placa!;
        const tipo = clasificador.clasificar(placa);
        const generar = new GenerarCobro(
          new CobroPostgresRepository(gestor),
          new FranjaPostgresRepository(gestor),
          new TarifaPostgresRepository(gestor),
          this.dias,
          this.horario,
          new RegistroEstrategiasTarifa([tarifaCarro, tarifaMoto]),
        );
        await generar.ejecutar({
          placa,
          tipoVehiculo: tipo,
          sedeId,
          ingresoEn: ocurridoEn,
        });
        await estancias.abrir(
          Estancia.abrir({
            placa,
            sedeId,
            carrilId,
            tipoVehiculo: tipo,
            ingresoEn: ocurridoEn,
          }),
        );
        resultado = { resultado: 'AUTORIZADO', motivo: 'Ingreso autorizado' };
      }
      await eventos.registrar(
        Evento.crear({
          sedeId: String(sedeId),
          carrilId: String(carrilId),
          placa: lectura.placa,
          sentido: 'ENTRADA',
          ...resultado,
          confianza:
            Number.isFinite(lectura.confianza) &&
            lectura.confianza >= 0 &&
            lectura.confianza <= 1
              ? lectura.confianza
              : null,
          origen: lectura.origen,
          operador: solicitud.operador,
          lecturaManual: lectura.origen === 'MANUAL',
          ocurridoEn,
        }),
      );
      return resultado;
    });
  }
}

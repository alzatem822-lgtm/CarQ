import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MqttClient } from 'mqtt';
import { contratoPresenciaMqtt } from '../../../compartido/mqtt/mensajes-mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import { SensorPresencia } from '../aplicacion/sensor-presencia';
import { actualizarEstadoMqtt } from './actualizar-estado-mqtt';

/** Recibe presencia física sin registrar ingresos ni ordenar la barrera. */
export class SensorMqtt
  extends SensorPresencia
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SensorMqtt.name);
  private readonly topico: string;
  private activo = false;
  private pendiente: Promise<void> = Promise.resolve();

  constructor(
    private readonly cliente: MqttClient,
    private readonly estadoCarril: EstadoCarrilStore,
    sedeId: number,
    carrilId: number,
  ) {
    super();
    this.topico = construirTopicosCarril(sedeId, carrilId).sensor;
  }

  onModuleInit(): void {
    if (this.activo) return;
    this.activo = true;
    this.cliente.on('message', this.recibir);
    // MQTT.js encola la suscripción hasta conectar y la restaura al reconectar.
    this.cliente.subscribe(this.topico, { qos: 0 }, (error, concedidos) => {
      if (
        this.activo &&
        (error || concedidos?.some((concedido) => concedido.qos === 128))
      )
        this.logger.warn('No se pudo suscribir el sensor MQTT');
    });
  }

  notificarPresencia(presente: boolean): Promise<void> {
    const operacion = this.pendiente.then(() =>
      actualizarEstadoMqtt(this.estadoCarril, (estado) => {
        if (estado.vehiculoPresente === presente) return;
        return {
          ...estado,
          vehiculoPresente: presente,
        };
      }),
    );
    this.pendiente = operacion.catch(() => undefined);
    return operacion;
  }

  private readonly recibir = (topico: string, payload: Buffer): void => {
    if (!this.activo || topico !== this.topico) return;
    let presencia: boolean;
    try {
      presencia = contratoPresenciaMqtt.decodificar(payload).presencia;
    } catch {
      this.logger.warn('Mensaje de presencia MQTT inválido descartado');
      return;
    }
    void this.notificarPresencia(presencia).catch(() => {
      this.logger.error('No se pudo actualizar la presencia del carril');
    });
  };

  async onModuleDestroy(): Promise<void> {
    if (this.activo) {
      this.activo = false;
      this.cliente.removeListener('message', this.recibir);
      this.cliente.unsubscribe(this.topico, () => undefined);
    }
    await this.pendiente;
  }
}

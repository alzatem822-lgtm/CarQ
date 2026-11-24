import type { MqttClient } from 'mqtt';
import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import {
  contratoComandoBarreraMqtt,
  type MensajeComandoBarreraMqtt,
} from '../../../compartido/mqtt/mensajes-mqtt';
import { construirTopicosCarril } from '../../../compartido/mqtt/topicos-carril';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import type { EstadoCarril } from '../dominio/estado-carril';

const TIEMPO_PUBLICACION_MS = 5000;

function noDisponible(): ErrorDominio {
  return new ErrorDominio(
    'BARRERA_NO_DISPONIBLE',
    'No se pudo confirmar la publicación del comando de barrera',
  );
}

/** Publica órdenes; el movimiento físico lo confirma el firmware por su tópico. */
export class BarreraMqtt extends BarreraCarril {
  private readonly topico: string;
  private pendiente: Promise<void> = Promise.resolve();

  constructor(
    private readonly cliente: MqttClient,
    private readonly estadoCarril: EstadoCarrilStore,
    sedeId: number,
    carrilId: number,
  ) {
    super();
    this.topico = construirTopicosCarril(sedeId, carrilId).comandoBarrera;
  }

  abrir(motivo: string): Promise<void> {
    return this.ordenar('abrir', motivo);
  }

  denegar(motivo: string): Promise<void> {
    return this.ordenar('denegar', motivo);
  }

  /** Disponible para control explícito; el cierre automático lo hace el firmware. */
  cerrar(motivo: string): Promise<void> {
    return this.ordenar('cerrar', motivo);
  }

  async consultarEstado(): Promise<EstadoCarril['barrera']> {
    await this.pendiente;
    return { ...(await this.estadoCarril.obtener()).barrera };
  }

  private ordenar(
    comando: MensajeComandoBarreraMqtt['comando'],
    motivo: string,
  ): Promise<void> {
    if (
      !this.cliente.connected ||
      this.cliente.disconnecting ||
      this.cliente.disconnected
    )
      return Promise.reject(noDisponible());
    const conexion = this.cliente.stream;
    const operacion = this.pendiente.then(async () => {
      // Una orden pendiente de otra conexión no se reproduce tras reconectar.
      if (this.cliente.stream !== conexion) throw noDisponible();
      await this.publicar(contratoComandoBarreraMqtt.codificar({ comando }));
      const estado = await this.estadoCarril.obtener();
      await this.estadoCarril.guardar({
        ...estado,
        barrera: { ...estado.barrera, motivo },
      });
    });
    this.pendiente = operacion.catch(() => undefined);
    return operacion;
  }

  private publicar(payload: string): Promise<void> {
    if (
      !this.cliente.connected ||
      this.cliente.disconnecting ||
      this.cliente.disconnected
    )
      return Promise.reject(noDisponible());

    return new Promise<void>((resolver, rechazar) => {
      let terminado = false;
      const finalizar = (fallo: boolean) => {
        if (terminado) return;
        terminado = true;
        clearTimeout(temporizador);
        this.cliente.removeListener('close', alDesconectar);
        this.cliente.removeListener('error', alDesconectar);
        if (fallo) rechazar(noDisponible());
        else resolver();
      };
      const alDesconectar = () => finalizar(true);
      const temporizador = setTimeout(alDesconectar, TIEMPO_PUBLICACION_MS);
      this.cliente.once('close', alDesconectar);
      this.cliente.once('error', alDesconectar);
      try {
        // QoS 0 y sin retain: no repetir una orden física al reconectar o suscribir.
        this.cliente.publish(
          this.topico,
          payload,
          { qos: 0, retain: false },
          (error) => finalizar(Boolean(error)),
        );
      } catch {
        finalizar(true);
      }
    });
  }
}

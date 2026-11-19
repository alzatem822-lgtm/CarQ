import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { BarreraCarril } from '../aplicacion/barrera-carril';
import { EstadoCarrilStore } from '../aplicacion/estado-carril.store';
import type { EstadoCarril } from '../dominio/estado-carril';

const TIEMPO_APERTURA_MS = 5000;

/** Reproduce la apertura, denegación y cierre automático del circuito. */
export class BarreraSimulada extends BarreraCarril implements OnModuleDestroy {
  private readonly logger = new Logger(BarreraSimulada.name);
  private temporizador: ReturnType<typeof setTimeout> | undefined;
  private apertura = 0;
  private pendiente: Promise<void> = Promise.resolve();

  constructor(private readonly estadoCarril: EstadoCarrilStore) {
    super();
  }

  async abrir(motivo: string): Promise<void> {
    await this.encolar(async () => {
      const estado = await this.estadoCarril.obtener();
      await this.estadoCarril.guardar({
        ...estado,
        barrera: { estado: 'ABIERTA', motivo },
      });
      this.cancelarTemporizador();
      const apertura = ++this.apertura;
      this.temporizador = setTimeout(() => {
        void this.encolar(async () => {
          if (apertura !== this.apertura) return;
          const actual = await this.estadoCarril.obtener();
          await this.estadoCarril.guardar({
            ...actual,
            barrera: { ...actual.barrera, estado: 'CERRADA' },
          });
          this.temporizador = undefined;
        }).catch(() => {
          this.logger.error(
            'No se pudo registrar el cierre automático simulado',
          );
        });
      }, TIEMPO_APERTURA_MS);
      this.temporizador.unref();
    });
  }

  /** Señala el rechazo sin mover la barrera ni cancelar su cierre automático. */
  async denegar(motivo: string): Promise<void> {
    await this.encolar(async () => {
      const estado = await this.estadoCarril.obtener();
      await this.estadoCarril.guardar({
        ...estado,
        barrera: { ...estado.barrera, motivo },
      });
    });
  }

  async consultarEstado(): Promise<EstadoCarril['barrera']> {
    await this.pendiente;
    const estado = await this.estadoCarril.obtener();
    return { ...estado.barrera };
  }

  /** Retira el temporizador al apagar la aplicación. */
  onModuleDestroy(): Promise<void> {
    return this.encolar(() => {
      this.apertura++;
      this.cancelarTemporizador();
      return Promise.resolve();
    });
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== undefined) {
      clearTimeout(this.temporizador);
      this.temporizador = undefined;
    }
  }

  /** Evita que las órdenes y el temporizador se sobrescriban entre sí. */
  private encolar(operacion: () => Promise<void>): Promise<void> {
    const resultado = this.pendiente.then(operacion);
    this.pendiente = resultado.catch(() => undefined);
    return resultado;
  }
}

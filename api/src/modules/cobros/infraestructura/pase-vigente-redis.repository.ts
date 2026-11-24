import type { Redis } from 'ioredis';
import { Reloj } from '../../../compartido/reloj/reloj';
import {
  ClavePase,
  PaseVigente,
  PaseVigenteRepository,
} from '../aplicacion/pase-vigente.repository';

export class PaseVigenteRedisRepository extends PaseVigenteRepository {
  constructor(
    private readonly redis: Pick<Redis, 'get' | 'set' | 'status'>,
    private readonly reloj: Reloj,
  ) {
    super();
  }

  async guardar(pase: PaseVigente): Promise<void> {
    const venceEn = pase.venceEn.getTime();
    if (venceEn <= this.reloj.ahora().getTime()) return;
    this.comprobarConexion();
    await this.redis.set(
      claveRedis(pase),
      JSON.stringify({ cobroId: pase.cobroId, pagoId: pase.pagoId, venceEn }),
      'PXAT',
      venceEn,
    );
  }

  async consultar(clave: ClavePase): Promise<PaseVigente | null> {
    this.comprobarConexion();
    const texto = await this.redis.get(claveRedis(clave));
    if (texto === null) return null;
    const datos: unknown = JSON.parse(texto);
    if (
      typeof datos !== 'object' ||
      datos === null ||
      !('cobroId' in datos) ||
      typeof datos.cobroId !== 'number' ||
      !Number.isSafeInteger(datos.cobroId) ||
      datos.cobroId < 1 ||
      !('venceEn' in datos) ||
      typeof datos.venceEn !== 'number' ||
      !Number.isFinite(datos.venceEn) ||
      datos.venceEn <= this.reloj.ahora().getTime()
    )
      return null;
    const pagoId =
      'pagoId' in datos && typeof datos.pagoId === 'number'
        ? datos.pagoId
        : undefined;
    return {
      ...clave,
      cobroId: datos.cobroId,
      pagoId,
      venceEn: new Date(datos.venceEn),
    };
  }

  private comprobarConexion(): void {
    if (this.redis.status !== 'ready')
      throw new Error('Redis no está disponible para consultar el pase.');
  }
}

function claveRedis({ placa, sedeId, diaOperativo }: ClavePase): string {
  return `carq:pase:${sedeId}:${placa.valor}:${diaOperativo}`;
}

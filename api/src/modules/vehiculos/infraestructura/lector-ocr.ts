import { ErrorDominio } from '../../../compartido/errores/error-dominio';
import { LectorPlaca, type SolicitudLectura } from '../aplicacion/lector-placa';
import type { LecturaPlaca } from '../dominio/lectura-placa';
import { Placa } from '../dominio/placa';
import { PlacaInvalidaError } from '../dominio/placa-invalida.error';

const SIN_PLACA: LecturaPlaca = { placa: null, confianza: 0, origen: 'OCR' };

/** Cliente del servicio LPR: el carril continúa dependiendo del puerto LectorPlaca. */
export class LectorOcr extends LectorPlaca {
  private readonly ruta: URL;

  constructor(
    urlLpr: string,
    private readonly tiempoMaximoMs = 5000,
  ) {
    super();
    try {
      const base = new URL(urlLpr);
      if (!['http:', 'https:'].includes(base.protocol)) throw new Error();
      this.ruta = new URL(`${base.pathname.replace(/\/$/, '')}/read`, base);
    } catch {
      throw new ErrorDominio(
        'URL_LPR_INVALIDA',
        'La URL del servicio LPR debe ser HTTP o HTTPS',
      );
    }
  }

  async leer(solicitud: SolicitudLectura): Promise<LecturaPlaca> {
    if (!solicitud.imagen?.length) return { ...SIN_PLACA };
    const cuerpo = new FormData();
    cuerpo.append(
      'imagen',
      new Blob([Uint8Array.from(solicitud.imagen)]),
      'captura',
    );
    const respuesta = await fetch(this.ruta, {
      method: 'POST',
      body: cuerpo,
      signal: AbortSignal.timeout(this.tiempoMaximoMs),
      redirect: 'error',
    });
    if (!respuesta.ok)
      throw new ErrorDominio(
        'LPR_NO_DISPONIBLE',
        'El servicio LPR no pudo completar la lectura',
      );
    const lectura: unknown = await respuesta.json();
    if (
      !lectura ||
      typeof lectura !== 'object' ||
      !('placa' in lectura) ||
      !('confianza' in lectura) ||
      typeof lectura.confianza !== 'number' ||
      !Number.isFinite(lectura.confianza) ||
      lectura.confianza < 0 ||
      lectura.confianza > 1 ||
      (lectura.placa !== null &&
        (typeof lectura.placa !== 'string' || lectura.placa.length > 32)) ||
      (lectura.placa === null && lectura.confianza !== 0)
    )
      throw new ErrorDominio(
        'RESPUESTA_LPR_INVALIDA',
        'El servicio LPR devolvió una lectura inválida',
      );
    if (lectura.placa === null) return { ...SIN_PLACA };
    try {
      return {
        placa: Placa.crear((lectura.placa as string).replace(/[\s-]/g, '')),
        confianza: lectura.confianza,
        origen: 'OCR',
      };
    } catch (error) {
      if (error instanceof PlacaInvalidaError) return { ...SIN_PLACA };
      throw error;
    }
  }
}

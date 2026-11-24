import Ajv, { type JSONSchemaType } from 'ajv';
import { TextDecoder } from 'node:util';
import { ErrorDominio } from '../errores/error-dominio';

export interface MensajePresenciaMqtt {
  readonly presencia: boolean;
}

export interface MensajeComandoBarreraMqtt {
  readonly comando: 'abrir' | 'denegar' | 'cerrar';
}

export interface MensajeEstadoBarreraMqtt {
  readonly estado: 'abierta' | 'cerrada';
}

export interface ContratoMensajeMqtt<T extends object> {
  readonly esquema: JSONSchemaType<T>;
  decodificar(payload: Buffer | string): T;
  codificar(mensaje: T): string;
}

export const MAX_BYTES_MENSAJE_MQTT = 1024;
const ajv = new Ajv({
  strict: true,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
});

function mensajeInvalido(): ErrorDominio {
  // Los errores son seguros para logs: no contienen el payload recibido.
  return new ErrorDominio(
    'MENSAJE_MQTT_INVALIDO',
    'El mensaje MQTT no cumple el contrato',
  );
}

/** Compila cada esquema una sola vez y comparte sus reglas al leer y escribir. */
function crearContrato<T extends object>(
  esquema: JSONSchemaType<T>,
): ContratoMensajeMqtt<T> {
  const validar = ajv.compile(esquema);
  return Object.freeze({
    esquema,
    decodificar(payload: Buffer | string): T {
      let mensaje: unknown;
      try {
        if (!Buffer.isBuffer(payload) && typeof payload !== 'string')
          throw mensajeInvalido();
        const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
        if (bytes.length === 0 || bytes.length > MAX_BYTES_MENSAJE_MQTT)
          throw mensajeInvalido();
        mensaje = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(bytes),
        );
      } catch {
        throw mensajeInvalido();
      }
      if (!validar(mensaje)) throw mensajeInvalido();
      return mensaje;
    },
    codificar(mensaje: T): string {
      if (!validar(mensaje)) throw mensajeInvalido();
      return JSON.stringify(mensaje);
    },
  });
}

export const contratoPresenciaMqtt = crearContrato<MensajePresenciaMqtt>({
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: { presencia: { type: 'boolean' } },
  required: ['presencia'],
  additionalProperties: false,
});

export const contratoComandoBarreraMqtt =
  crearContrato<MensajeComandoBarreraMqtt>({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      comando: { type: 'string', enum: ['abrir', 'denegar', 'cerrar'] },
    },
    required: ['comando'],
    additionalProperties: false,
  });

export const contratoEstadoBarreraMqtt =
  crearContrato<MensajeEstadoBarreraMqtt>({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { estado: { type: 'string', enum: ['abierta', 'cerrada'] } },
    required: ['estado'],
    additionalProperties: false,
  });

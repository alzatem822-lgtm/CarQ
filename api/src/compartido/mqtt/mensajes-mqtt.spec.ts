import Ajv from 'ajv';
import { ErrorDominio } from '../errores/error-dominio';
import {
  contratoComandoBarreraMqtt,
  contratoEstadoBarreraMqtt,
  contratoPresenciaMqtt,
  type ContratoMensajeMqtt,
  MAX_BYTES_MENSAJE_MQTT,
} from './mensajes-mqtt';

function probarContrato<T extends object>(
  nombre: string,
  contrato: ContratoMensajeMqtt<T>,
  validos: T[],
  invalidos: unknown[],
) {
  describe(`Contrato MQTT de ${nombre} (CARQ-185)`, () => {
    for (const mensaje of validos) {
      it(`lee y escribe ${JSON.stringify(mensaje)} sin cambiar sus tipos`, () => {
        const json = contrato.codificar(mensaje);
        expect(JSON.parse(json)).toEqual(mensaje);
        expect(contrato.decodificar(json)).toEqual(mensaje);
        expect(contrato.decodificar(Buffer.from(json))).toEqual(mensaje);
      });
    }

    it('exporta un esquema JSON validable por un consumidor independiente', () => {
      const esquema = JSON.parse(JSON.stringify(contrato.esquema));
      const validar = new Ajv({ strict: true }).compile(esquema);
      for (const mensaje of validos) expect(validar(mensaje)).toBe(true);
      for (const mensaje of invalidos) expect(validar(mensaje)).toBe(false);
    });

    for (const mensaje of [...invalidos, null, [], {}, true, 1, 'texto']) {
      it(`rechaza ${JSON.stringify(mensaje)} al recibirlo y antes de publicarlo`, () => {
        expect(() => contrato.decodificar(JSON.stringify(mensaje))).toThrow(
          ErrorDominio,
        );
        // Una llamada desde JavaScript tampoco puede publicar mensajes inválidos.
        expect(() => contrato.codificar(mensaje as T)).toThrow(ErrorDominio);
      });
    }

    it('rechaza JSON roto, payload vacío, UTF-8 inválido y mensajes excesivos', () => {
      for (const payload of [
        '',
        '{',
        Buffer.from([0xff]),
        ' '.repeat(MAX_BYTES_MENSAJE_MQTT) + JSON.stringify(validos[0]),
      ])
        expect(() => contrato.decodificar(payload)).toThrow(ErrorDominio);
    });

    it('no refleja datos del payload en el error', () => {
      try {
        contrato.decodificar('{"placa":"ABC123","token":"token-secreto"}');
        throw new Error('La validación debió rechazar el mensaje');
      } catch (error) {
        expect(error).toMatchObject({
          codigo: 'MENSAJE_MQTT_INVALIDO',
          message: 'El mensaje MQTT no cumple el contrato',
        });
        expect(String(error)).not.toMatch(/ABC123|token-secreto/);
      }
    });
  });
}

probarContrato(
  'presencia',
  contratoPresenciaMqtt,
  [{ presencia: true }, { presencia: false }],
  [
    { presencia: 'false' },
    { presencia: 1 },
    { presencia: null },
    { presencia: true, extra: 'dato' },
    { comando: 'abrir' },
  ],
);

probarContrato(
  'comando de barrera',
  contratoComandoBarreraMqtt,
  [{ comando: 'abrir' }, { comando: 'denegar' }, { comando: 'cerrar' }],
  [
    { comando: 'ABRIR' },
    { comando: 'desconocido' },
    { comando: true },
    { comando: 'abrir', extra: 'dato' },
    { estado: 'abierta' },
  ],
);

probarContrato(
  'estado de barrera',
  contratoEstadoBarreraMqtt,
  [{ estado: 'abierta' }, { estado: 'cerrada' }],
  [
    { estado: 'ABIERTA' },
    { estado: 'abriendo' },
    { estado: false },
    { estado: 'cerrada', extra: 'dato' },
    { presencia: true },
  ],
);

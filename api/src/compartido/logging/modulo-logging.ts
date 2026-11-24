import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { generarIdPeticion } from './generar-id-peticion';
import { RUTAS_CENSURADAS, TEXTO_CENSURADO } from './rutas-censuradas';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => generarIdPeticion(req.headers),
        timestamp: stdTimeFunctions.isoTime,
        formatters: { level: (etiqueta) => ({ level: etiqueta }) },
        serializers: {
          req: (req: { url?: string }) => {
            // Los filtros pueden contener placas o credenciales incluso en rutas
            // inv�lidas. Se conserva la ruta, sin registrar valores de consulta.
            return { ...req, url: req.url?.split('?')[0], query: undefined };
          },
        },
        redact: { paths: RUTAS_CENSURADAS, censor: TEXTO_CENSURADO },
      },
    }),
  ],
})
export class ModuloLogging {}

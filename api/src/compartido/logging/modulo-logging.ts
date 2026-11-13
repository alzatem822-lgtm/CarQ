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
        redact: { paths: RUTAS_CENSURADAS, censor: TEXTO_CENSURADO },
      },
    }),
  ],
})
export class ModuloLogging {}
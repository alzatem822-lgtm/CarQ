import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { generarIdPeticion } from './generar-id-peticion';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => generarIdPeticion(req.headers),
        timestamp: stdTimeFunctions.isoTime,
        formatters: { level: (etiqueta) => ({ level: etiqueta }) },
      },
    }),
  ],
})
export class ModuloLogging {}
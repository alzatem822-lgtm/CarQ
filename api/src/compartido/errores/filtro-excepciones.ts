import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { traducirExcepcion } from './traducir-excepcion';

@Catch()
export class FiltroExcepciones implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcepciones.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const { estado, cuerpo } = traducirExcepcion(excepcion);

    if (estado === HttpStatus.INTERNAL_SERVER_ERROR) {
      const traza = excepcion instanceof Error ? excepcion.stack : undefined;
      this.logger.error('Error no controlado', traza);
    }

    host.switchToHttp().getResponse<Response>().status(estado).json(cuerpo);
  }
}
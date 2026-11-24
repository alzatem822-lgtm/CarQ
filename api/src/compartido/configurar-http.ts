import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { configurarSwagger } from './documentacion/swagger';
import { FiltroExcepciones } from './errores/filtro-excepciones';
import { crearOpcionesCors } from './seguridad/opciones-cors';
import { crearPipeValidacion } from './validacion/crear-pipe-validacion';

/** Misma configuración HTTP en el arranque y en las pruebas integradas. */
export function configurarHttp(app: INestApplication, urlWeb: string) {
  app.use(helmet());
  app.enableCors(crearOpcionesCors(urlWeb));
  app.useGlobalFilters(new FiltroExcepciones());
  app.useGlobalPipes(crearPipeValidacion());
  return configurarSwagger(app);
}

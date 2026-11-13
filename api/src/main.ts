import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ConfiguracionSistema } from './compartido/configuracion/configuracion-sistema';
import { FiltroExcepciones } from './compartido/errores/filtro-excepciones';
import { crearOpcionesCors } from './compartido/seguridad/opciones-cors';
import { crearPipeValidacion } from './compartido/validacion/crear-pipe-validacion';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configuracion = app.get(ConfiguracionSistema);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors(crearOpcionesCors(configuracion.obtener('URL_WEB')));
  app.useGlobalFilters(new FiltroExcepciones());
  app.useGlobalPipes(crearPipeValidacion());

  await app.listen(configuracion.obtener('PUERTO'));
}
void bootstrap();
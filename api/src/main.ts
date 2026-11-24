import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ConfiguracionSistema } from './compartido/configuracion/configuracion-sistema';
import { configurarHttp } from './compartido/configurar-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configuracion = app.get(ConfiguracionSistema);

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  configurarHttp(app, configuracion.obtener('URL_WEB'));

  await app.listen(configuracion.obtener('PUERTO'));
}
void bootstrap();

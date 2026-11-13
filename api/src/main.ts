import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfiguracionSistema } from './compartido/configuracion/configuracion-sistema';
import { FiltroExcepciones } from './compartido/errores/filtro-excepciones';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new FiltroExcepciones());
  const configuracion = app.get(ConfiguracionSistema);
  await app.listen(configuracion.obtener('PUERTO'));
}
void bootstrap();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfiguracionSistema } from './compartido/configuracion/configuracion-sistema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuracion = app.get(ConfiguracionSistema);
  await app.listen(configuracion.obtener('PUERTO'));
}
void bootstrap();
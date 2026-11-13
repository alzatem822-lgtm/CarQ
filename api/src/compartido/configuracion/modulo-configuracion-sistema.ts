import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfiguracionSistema } from './configuracion-sistema';
import { validarEntorno } from './validar-entorno';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validarEntorno,
      envFilePath: ['.env', '../.env'],
    }),
  ],
  providers: [ConfiguracionSistema],
  exports: [ConfiguracionSistema],
})
export class ModuloConfiguracionSistema {}
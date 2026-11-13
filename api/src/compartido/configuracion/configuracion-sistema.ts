import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Entorno } from './validar-entorno';

@Injectable()
export class ConfiguracionSistema {
  constructor(private readonly config: ConfigService<Entorno, true>) {}

  obtener<K extends keyof Entorno>(clave: K): Entorno[K] {
    return this.config.get(clave, { infer: true });
  }
}
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

const entornoPrueba = {
  ZONA_HORARIA: 'America/Bogota',
  INICIO_DIA_OPERATIVO: '06:00',
  LECTOR_PLACAS: 'simulado',
  FUENTE_SENSOR: 'simulado',
  CONTROLADOR_BARRERA: 'simulado',
  URL_BASE_DATOS: 'postgresql://carq:carq@db:5432/carq',
  URL_REDIS: 'redis://redis:6379',
  URL_MQTT: 'mqtt://mqtt:1883',
  URL_LPR: 'http://lpr:8000',
  URL_WEB: 'http://localhost:3000',
  JWT_SECRETO: 'secreto-de-prueba',
};

@Module({})
class ModuloBaseDatosVacio {}

describe('AppModule', () => {
  beforeAll(() => {
    Object.assign(process.env, entornoPrueba);
  });

  afterAll(() => {
    for (const clave of Object.keys(entornoPrueba)) {
      delete process.env[clave];
    }
  });

  it('compila con los tres módulos sin conectar a la base', async () => {
    const { AppModule } = await import('./app.module');
    const { ModuloBaseDatos } = await import(
      './compartido/base-datos/modulo-base-datos'
    );

    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(ModuloBaseDatos)
      .useModule(ModuloBaseDatosVacio)
      .compile();

    expect(modulo).toBeDefined();
  });
});
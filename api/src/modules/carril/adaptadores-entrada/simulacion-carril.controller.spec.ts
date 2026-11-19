import { INestApplication, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { registrarConSensorSimulado } from '../../../compartido/configuracion/registrar-con-sensor-simulado';
import { configurarHttp } from '../../../compartido/configurar-http';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { SimularLlegada } from '../aplicacion/simular-llegada';
import { estadoCarrilInicial } from '../dominio/estado-carril';
import { EstadoCarrilEnMemoriaStore } from '../infraestructura/estado-carril-en-memoria.store';
import { SensorSimulado } from '../infraestructura/sensor-simulado';
import { SimulacionCarrilController } from './simulacion-carril.controller';

let estado: EstadoCarrilEnMemoriaStore;
let sensor: SensorSimulado;

@Module({
  controllers: [SimulacionCarrilController],
  providers: [
    { provide: SimularLlegada, useFactory: () => new SimularLlegada(sensor) },
    {
      provide: EmisorTokens,
      useValue: {
        verificar: (token: string) => {
          if (token === 'operador') {
            return Promise.resolve({ nombre: 'operador', rol: Rol.OPERADOR });
          }
          if (token === 'admin') {
            return Promise.resolve({ nombre: 'admin', rol: Rol.ADMINISTRADOR });
          }
          return Promise.reject(new Error('Token inválido'));
        },
      },
    },
  ],
})
class RutasSimulacionPrueba {}

describe('POST /carril/simulacion/llegada', () => {
  let app: INestApplication | undefined;
  const fuenteOriginal = process.env.FUENTE_SENSOR;

  beforeAll(async () => {
    await ConfigModule.forRoot({ ignoreEnvFile: true });
  });

  beforeEach(() => {
    estado = new EstadoCarrilEnMemoriaStore();
    sensor = new SensorSimulado(estado);
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
    jest.restoreAllMocks();
    if (fuenteOriginal === undefined) delete process.env.FUENTE_SENSOR;
    else process.env.FUENTE_SENSOR = fuenteOriginal;
  });

  async function iniciar(tipo: 'simulado' | 'mqtt') {
    process.env.FUENTE_SENSOR = tipo;
    const modulo = await Test.createTestingModule({
      imports: [await registrarConSensorSimulado(RutasSimulacionPrueba)],
    }).compile();
    app = modulo.createNestApplication();
    const swagger = configurarHttp(app, 'http://localhost:3000');
    await app.init();
    return { servidor: app.getHttpServer(), swagger };
  }

  it('marca presencia sin abrir la barrera y publica su contrato para el operador', async () => {
    const { servidor, swagger } = await iniciar('simulado');
    await request(servidor)
      .post('/carril/simulacion/llegada')
      .set('Authorization', 'Bearer operador')
      .expect(200, { vehiculoPresente: true });

    expect(await estado.obtener()).toEqual({
      ...estadoCarrilInicial(),
      vehiculoPresente: true,
    });
    expect(swagger.paths['/carril/simulacion/llegada']?.post).toMatchObject({
      operationId: 'simularLlegada',
      security: [{ sesion: [] }],
    });
  });

  it.each([undefined, 'invalido', 'admin'])(
    'rechaza acceso no autorizado: %s',
    async (token) => {
      const { servidor } = await iniciar('simulado');
      const solicitud = request(servidor).post('/carril/simulacion/llegada');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const respuesta = await solicitud;
      expect(respuesta.status).toBe(token === 'admin' ? 403 : 401);
      expect(respuesta.body).toEqual({
        codigo: token === 'admin' ? 'FORBIDDEN' : 'UNAUTHORIZED',
        motivo: expect.any(String),
      });
      expect(await estado.obtener()).toEqual(estadoCarrilInicial());
    },
  );

  it('no registra la ruta ni la publica en Swagger con fuente MQTT', async () => {
    const { servidor, swagger } = await iniciar('mqtt');
    for (const token of [undefined, 'operador']) {
      const solicitud = request(servidor).post('/carril/simulacion/llegada');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const respuesta = await solicitud;
      expect(respuesta.status).toBe(404);
      expect(respuesta.body.codigo).toBe('NOT_FOUND');
    }
    expect(swagger.paths['/carril/simulacion/llegada']).toBeUndefined();
    expect(await estado.obtener()).toEqual(estadoCarrilInicial());
  });

  it('no confirma llegada si el sensor falla', async () => {
    const { servidor } = await iniciar('simulado');
    jest
      .spyOn(sensor, 'notificarPresencia')
      .mockRejectedValue(new Error('Fallo'));
    await request(servidor)
      .post('/carril/simulacion/llegada')
      .set('Authorization', 'Bearer operador')
      .expect(500, {
        codigo: 'ERROR_INTERNO',
        motivo: 'Error interno del servidor',
      });
    expect(await estado.obtener()).toEqual(estadoCarrilInicial());
  });
});

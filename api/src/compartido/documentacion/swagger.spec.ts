import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../../modules/acceso/adaptadores-entrada/auth.controller';
import { IniciarSesion } from '../../modules/acceso/aplicacion/iniciar-sesion';
import { EmisorTokens } from '../../modules/acceso/aplicacion/emisor-tokens';
import { CuposController } from '../../modules/configuracion/adaptadores-entrada/cupos.controller';
import { UmbralController } from '../../modules/configuracion/adaptadores-entrada/umbral.controller';
import { TarifasController } from '../../modules/configuracion/adaptadores-entrada/tarifas.controller';
import { ActualizarCupo } from '../../modules/configuracion/aplicacion/actualizar-cupo';
import { ActualizarUmbral } from '../../modules/configuracion/aplicacion/actualizar-umbral';
import { ActualizarTarifas } from '../../modules/configuracion/aplicacion/actualizar-tarifas';
import { ActualizarFranja } from '../../modules/configuracion/aplicacion/actualizar-franja';
import { ConsultarCupos } from '../../modules/configuracion/aplicacion/consultar-cupos';
import { ConsultarUmbral } from '../../modules/configuracion/aplicacion/consultar-umbral';
import { ConsultarConfiguracionTarifas } from '../../modules/configuracion/aplicacion/consultar-configuracion-tarifas';
import { FranjaRepository } from '../../modules/configuracion/aplicacion/franja.repository';
import { configurarHttp } from '../configurar-http';

describe('Publicación del contrato Swagger', () => {
  let app: INestApplication;
  let documento: ReturnType<typeof configurarHttp>;
  beforeAll(async () => {
    const tokens = [
      IniciarSesion,
      EmisorTokens,
      ActualizarCupo,
      ActualizarUmbral,
      ActualizarTarifas,
      ActualizarFranja,
      ConsultarCupos,
      ConsultarUmbral,
      ConsultarConfiguracionTarifas,
      FranjaRepository,
    ];
    const modulo = await Test.createTestingModule({
      controllers: [
        AuthController,
        CuposController,
        UmbralController,
        TarifasController,
      ],
      providers: [
        ...tokens.map((provide) => ({ provide, useValue: {} })),
        {
          provide: 'ResolverSedeConfiguracion',
          useValue: () => Promise.resolve('1'),
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    documento = configurarHttp(app, 'http://localhost:3000');
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('documenta las nueve operaciones con identificadores únicos y respuesta 200', () => {
    const operaciones = Object.values(documento.paths).flatMap((path) =>
      Object.entries(path ?? {})
        .filter(([metodo]) => ['get', 'put', 'post'].includes(metodo))
        .map(([, op]) => op),
    );
    expect(operaciones).toHaveLength(9);
    expect(new Set(operaciones.map((op) => op.operationId)).size).toBe(9);
    operaciones.forEach((op) => {
      expect(op.summary).toBeTruthy();
      expect(op.responses['200']).toBeDefined();
      expect(op.responses['500']).toBeDefined();
    });
  });
  it('marca login como público y todas las operaciones de configuración con JWT', () => {
    expect(documento.paths['/auth/login']?.post?.security).toBeUndefined();
    expect(documento.paths['/auth/sesion']?.get?.security).toContainEqual({
      sesion: [],
    });
    expect(
      documento.paths['/auth/sesion']?.get?.responses['401'],
    ).toBeDefined();
    expect(
      documento.paths['/auth/sesion']?.get?.responses['403'],
    ).toBeUndefined();
    for (const [ruta, path] of Object.entries(documento.paths)) {
      if (!ruta.startsWith('/configuracion/')) continue;
      for (const metodo of ['get', 'put'] as const) {
        const op = path?.[metodo];
        if (!op) continue;
        expect(op.security).toContainEqual({ sesion: [] });
        expect(op.responses['401']).toBeDefined();
        expect(op.responses['403']).toBeDefined();
      }
    }
  });
  it('publica esquemas anidados, límites y rechazo de propiedades adicionales', () => {
    const schemas = documento.components!.schemas!;
    expect(schemas.ActualizarCuposDto).toMatchObject({
      additionalProperties: false,
      required: ['cupos'],
      properties: {
        cupos: {
          type: 'array',
          minItems: 1,
          items: { $ref: '#/components/schemas/CupoDto' },
        },
      },
    });
    expect(schemas.ActualizarUmbralDto).toMatchObject({
      properties: { umbral: { minimum: 0, maximum: 1 } },
    });
    expect(schemas.InicioSesionDto).toMatchObject({
      properties: { contrasena: { writeOnly: true, format: 'password' } },
    });
  });
  it('sirve la interfaz, sus archivos y contratos JSON/YAML bajo Helmet', async () => {
    const servidor = app.getHttpServer();
    const pagina = await request(servidor).get('/docs/');
    expect(pagina.status).toBe(200);
    expect(pagina.text).toContain('swagger-ui');
    expect(pagina.headers['content-security-policy']).toBeTruthy();
    for (const archivo of [
      'swagger-ui.css',
      'swagger-ui-bundle.js',
      'swagger-ui-init.js',
    ])
      expect((await request(servidor).get(`/docs/${archivo}`)).status).toBe(
        200,
      );
    const json = await request(servidor).get('/docs-json');
    expect(json.status).toBe(200);
    expect(json.body.paths).toEqual(documento.paths);
    expect((await request(servidor).get('/docs-yaml')).status).toBe(200);
  });
  it('no conserva el token entre recargas de Swagger ni envía el contrato a un validador externo', async () => {
    const js = await request(app.getHttpServer()).get(
      '/docs/swagger-ui-init.js',
    );
    expect(js.text).toContain('"persistAuthorization": false');
    expect(js.text).toContain('"validatorUrl": null');
  });
});

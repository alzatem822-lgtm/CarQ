import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import {
  CredencialesInvalidas,
  IniciarSesion,
} from '../aplicacion/iniciar-sesion';
import { Rol } from '../dominio/rol';
import { AuthController } from './auth.controller';

describe('POST /auth/login', () => {
  let app: INestApplication;

  const iniciarSesionFalso = {
    ejecutar: async (nombre: string, contrasena: string) => {
      if (nombre === 'admin' && contrasena === 'secreta') {
        return { token: 'token-de-prueba', rol: Rol.ADMINISTRADOR };
      }
      throw new CredencialesInvalidas();
    },
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: IniciarSesion, useValue: iniciarSesionFalso }],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalFilters(new FiltroExcepciones());
    app.useGlobalPipes(crearPipeValidacion());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con token y rol si las credenciales son válidas', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nombre: 'admin', contrasena: 'secreta' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      token: 'token-de-prueba',
      rol: 'ADMINISTRADOR',
    });
  });

  it('responde 401 con codigo y motivo si las credenciales son inválidas', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nombre: 'admin', contrasena: 'mala' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toEqual({
      codigo: 'UNAUTHORIZED',
      motivo: 'Credenciales inválidas',
    });
  });

  it('responde lo mismo si el usuario no existe', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nombre: 'nadie', contrasena: 'secreta' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.motivo).toBe('Credenciales inválidas');
  });

  it('rechaza con 400 si falta algún campo', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ nombre: 'admin' });

    expect(respuesta.status).toBe(400);
  });
});
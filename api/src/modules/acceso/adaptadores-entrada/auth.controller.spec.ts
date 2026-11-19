import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import {
  CredencialesInvalidas,
  IniciarSesion,
} from '../aplicacion/iniciar-sesion';
import { EmisorTokens } from '../aplicacion/emisor-tokens';
import { Rol } from '../dominio/rol';
import { EmisorJwt } from '../infraestructura/emisor-jwt';
import { AuthController } from './auth.controller';

describe('Autenticación HTTP', () => {
  let app: INestApplication;
  const emisor = new EmisorJwt('clave-solo-para-estas-pruebas', '5m');

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
      providers: [
        { provide: IniciarSesion, useValue: iniciarSesionFalso },
        { provide: EmisorTokens, useValue: emisor },
      ],
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

  it.each([Rol.ADMINISTRADOR, Rol.OPERADOR])(
    'GET /auth/sesion devuelve el rol del JWT verificado',
    async (rol) => {
      const token = await emisor.emitir({ nombre: 'usuario', rol });
      await request(app.getHttpServer())
        .get('/auth/sesion')
        .set('Authorization', `Bearer ${token}`)
        .expect('Cache-Control', 'no-store')
        .expect(200, { rol: rol.codigo });
    },
  );

  it('GET /auth/sesion rechaza un JWT ausente, inválido o vencido', async () => {
    const consultar = () => request(app.getHttpServer()).get('/auth/sesion');
    const vencido = await new EmisorJwt(
      'clave-solo-para-estas-pruebas',
      '-1s',
    ).emitir({ nombre: 'usuario', rol: Rol.OPERADOR });
    await consultar().expect(401);
    await consultar().set('Authorization', 'Bearer invalido').expect(401);
    await consultar().set('Authorization', `Bearer ${vencido}`).expect(401);
  });
});

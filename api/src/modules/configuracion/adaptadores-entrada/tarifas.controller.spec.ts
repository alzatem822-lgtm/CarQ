import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FiltroExcepciones } from '../../../compartido/errores/filtro-excepciones';
import { crearPipeValidacion } from '../../../compartido/validacion/crear-pipe-validacion';
import { EmisorTokens } from '../../acceso/aplicacion/emisor-tokens';
import { Rol } from '../../acceso/dominio/rol';
import { TipoVehiculo } from '../../vehiculos/dominio/tipo-vehiculo';
import { ActualizarFranja } from '../aplicacion/actualizar-franja';
import { ActualizarTarifas } from '../aplicacion/actualizar-tarifas';
import { ConsultarConfiguracionTarifas } from '../aplicacion/consultar-configuracion-tarifas';
import { FranjaRepository } from '../aplicacion/franja.repository';
import { TarifaRepository } from '../aplicacion/tarifa.repository';
import { Franja } from '../dominio/franja';
import { Tarifa } from '../dominio/tarifa';
import { TarifasController } from './tarifas.controller';

describe('Configuración HTTP de tarifas y franja', () => {
  let app: INestApplication;
  let tarifas: Tarifa[];
  let franja: Franja;
  const repoTarifas: TarifaRepository = {
    obtenerTodas: () => Promise.resolve(tarifas),
    guardarTodas: (nuevas) => { tarifas = nuevas; return Promise.resolve(); },
  };
  const repoFranja: FranjaRepository = {
    obtener: () => Promise.resolve(franja),
    guardar: (nueva) => { franja = nueva; return Promise.resolve(); },
  };
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [TarifasController], providers: [
        { provide: EmisorTokens, useValue: { verificar: (token: string) => token === 'admin' ? Promise.resolve({ nombre: 'admin', rol: Rol.ADMINISTRADOR }) : token === 'operador' ? Promise.resolve({ nombre: 'operador', rol: Rol.OPERADOR }) : Promise.reject(new Error('inválido')) } },
        { provide: ConsultarConfiguracionTarifas, useValue: new ConsultarConfiguracionTarifas(repoTarifas, repoFranja) },
        { provide: ActualizarTarifas, useValue: new ActualizarTarifas(repoTarifas) },
        { provide: ActualizarFranja, useValue: new ActualizarFranja(repoFranja) },
        { provide: FranjaRepository, useValue: repoFranja },
        { provide: 'ResolverSedeConfiguracion', useValue: () => Promise.resolve('1') },
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(crearPipeValidacion());
    app.useGlobalFilters(new FiltroExcepciones());
    await app.init();
  });
  beforeEach(() => {
    tarifas = [Tarifa.crear('1', TipoVehiculo.CARRO, 'DIURNA', 5000), Tarifa.crear('1', TipoVehiculo.CARRO, 'NOCTURNA', 3000), Tarifa.crear('1', TipoVehiculo.MOTO, 'DIURNA', 0), Tarifa.crear('1', TipoVehiculo.MOTO, 'NOCTURNA', 0)];
    franja = Franja.diurna(6, 18);
  });
  afterAll(async () => { await app.close(); });
  const servidor = () => app.getHttpServer();
  const admin = { Authorization: 'Bearer admin' };
  it('consulta el contrato de tarifas y horario', async () => {
    const r = await request(servidor()).get('/configuracion/tarifas').set(admin);
    expect(r.status).toBe(200); expect(r.body.tarifas).toHaveLength(4); expect(r.body.franja).toEqual({ inicioHora: 6, finHora: 18 });
  });
  it('guarda una tarifa parcial y conserva las restantes', async () => {
    const r = await request(servidor()).put('/configuracion/tarifas').set(admin).send({ tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 7000 }] });
    expect(r.status).toBe(200); expect(r.body.tarifas).toHaveLength(4);
    expect(r.body.tarifas).toContainEqual({ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 7000 });
  });
  it('rechaza RN-02 al combinar cambios parciales con valores vigentes', async () => {
    const r = await request(servidor()).put('/configuracion/tarifas').set(admin).send({ tarifas: [{ tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 5000 }] });
    expect(r.status).toBe(422); expect(r.body.codigo).toBe('TARIFA_INVALIDA'); expect(tarifas[1].valor).toBe(3000);
  });
  it('admite la decisión de gratuidad 0/0', async () => {
    const r = await request(servidor()).put('/configuracion/tarifas').set(admin).send({ tarifas: [{ tipoVehiculo: 'MOTO', franja: 'DIURNA', valor: 0 }, { tipoVehiculo: 'MOTO', franja: 'NOCTURNA', valor: 0 }] });
    expect(r.status).toBe(200);
  });
  it.each([
    { tarifas: [] },
    { tarifas: [{ tipoVehiculo: 'OTRO', franja: 'DIURNA', valor: 1 }] },
    { tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: -1 }] },
    { tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 1.5 }] },
    { tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: '5000' }] },
    { tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 1, extra: true }] },
    { tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 1 }, { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 2 }] },
  ])('rechaza cuerpos inválidos sin modificar tarifas: %j', async (cuerpo) => {
    const r = await request(servidor()).put('/configuracion/tarifas').set(admin).send(cuerpo);
    expect(r.status).toBe(400); expect(tarifas[0].valor).toBe(5000);
  });
  it('guarda el horario y lo devuelve al consultar', async () => {
    const r = await request(servidor()).put('/configuracion/franja').set(admin).send({ inicioHora: 7, finHora: 19 });
    expect(r.status).toBe(200); expect(r.body).toEqual({ inicioHora: 7, finHora: 19 });
    expect((await request(servidor()).get('/configuracion/tarifas').set(admin)).body.franja).toEqual(r.body);
  });
  it('rechaza horario incoherente sin cambiarlo', async () => {
    const r = await request(servidor()).put('/configuracion/franja').set(admin).send({ inicioHora: 18, finHora: 6 });
    expect(r.status).toBe(422); expect(r.body.codigo).toBe('FRANJA_INVALIDA'); expect(franja.inicioHora).toBe(6);
  });
  it('rechaza tipos incorrectos y campos adicionales del horario', async () => {
    const r = await request(servidor()).put('/configuracion/franja').set(admin).send({ inicioHora: '6', finHora: 18, extra: true });
    expect(r.status).toBe(400); expect(franja.inicioHora).toBe(6);
  });
  it.each(['/configuracion/tarifas', '/configuracion/franja'])('exige autenticación y rol al escribir %s', async (ruta) => {
    expect((await request(servidor()).put(ruta).send({})).status).toBe(401);
    expect((await request(servidor()).put(ruta).set({ Authorization: 'Bearer operador' }).send({})).status).toBe(403);
  });
  it('protege la consulta de tarifas', async () => {
    expect((await request(servidor()).get('/configuracion/tarifas')).status).toBe(401);
    expect((await request(servidor()).get('/configuracion/tarifas').set({ Authorization: 'Bearer operador' })).status).toBe(403);
  });
});

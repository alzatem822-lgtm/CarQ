import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppModule } from '../../app.module';
import { configurarHttp } from '../configurar-http';
import { ConfiguracionSistema } from '../configuracion/configuracion-sistema';
import { validarEntorno } from '../configuracion/validar-entorno';
import {
  iniciarBaseDatosPruebas,
  limpiarBaseDatosPruebas,
} from './base-datos-pruebas';
import { sembrarSedeYCarril } from '../base-datos/seeds/sede-carril.seed';
import { sembrarUsuarios } from '../base-datos/seeds/usuarios.seed';
import { sembrarCupos } from '../base-datos/seeds/cupos.seed';
import { sembrarTarifasYFranja } from '../base-datos/seeds/tarifas-franja.seed';
import { sembrarUmbral } from '../base-datos/seeds/umbral.seed';
import { EstadoCarrilStore } from '../../modules/carril/aplicacion/estado-carril.store';
import { estadoCarrilInicial } from '../../modules/carril/dominio/estado-carril';

const SECRETO_PRUEBA = 'carq-solo-pruebas-http-integradas';
const ESCRITURAS = [
  {
    ruta: '/configuracion/cupos',
    cuerpo: {
      cupos: [
        { tipoVehiculo: 'CARRO', maximo: 12 },
        { tipoVehiculo: 'MOTO', maximo: 8 },
      ],
    },
  },
  { ruta: '/configuracion/umbral', cuerpo: { umbral: 0.85 } },
  {
    ruta: '/configuracion/tarifas',
    cuerpo: {
      tarifas: [
        { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 7000 },
        { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 4000 },
      ],
    },
  },
  { ruta: '/configuracion/franja', cuerpo: { inicioHora: 7, finHora: 19 } },
];
const CONSULTAS = [
  '/configuracion/cupos',
  '/configuracion/umbral',
  '/configuracion/tarifas',
];

describe('API completa con PostgreSQL, bcrypt y JWT reales', () => {
  let app: INestApplication | undefined;
  let db: DataSource | undefined;
  let tokenAdmin: string;
  let tokenOperador: string;
  const servidor = () => app!.getHttpServer();
  const admin = () => ({ Authorization: `Bearer ${tokenAdmin}` });
  beforeAll(async () => {
    db = await iniciarBaseDatosPruebas();
    await limpiarBaseDatosPruebas(db);
    await sembrarSedeYCarril(db);
    await sembrarUsuarios(db);
    await sembrarCupos(db);
    await sembrarTarifasYFranja(db);
    await sembrarUmbral(db);
    const entorno = validarEntorno({
      ...process.env,
      NODE_ENV: 'test',
      URL_BASE_DATOS: process.env.URL_BASE_DATOS_PRUEBAS,
      URL_REDIS: process.env.URL_REDIS_PRUEBAS,
      JWT_SECRETO: SECRETO_PRUEBA,
      JWT_EXPIRACION: '1h',
      URL_WEB: 'http://localhost:3002',
    });
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfiguracionSistema)
      .useValue({ obtener: (clave: keyof typeof entorno) => entorno[clave] })
      .compile();
    app = modulo.createNestApplication();
    configurarHttp(app, entorno.URL_WEB);
    await app.init();
    const a = await request(servidor())
      .post('/auth/login')
      .send({ nombre: 'administrador', contrasena: 'administrador123' });
    const o = await request(servidor())
      .post('/auth/login')
      .send({ nombre: 'operador', contrasena: 'operador123' });
    expect(a.status).toBe(200);
    expect(o.status).toBe(200);
    tokenAdmin = a.body.token;
    tokenOperador = o.body.token;
  }, 30000);
  beforeEach(async () => {
    await db!.query(
      'UPDATE cupo SET maximo = CASE WHEN tipo = $1 THEN 3 ELSE 5 END',
      ['CARRO'],
    );
    await db!.query('UPDATE parametro_sede SET umbral_confianza = 0.80');
    await db!.query('UPDATE franja SET inicio_hora = 6, fin_hora = 18');
    await db!.transaction(async (gestor) => {
      await gestor.query(
        `UPDATE tarifa SET valor = CASE WHEN tipo_vehiculo = 'MOTO' THEN 0 WHEN franja = 'DIURNA' THEN 5000 ELSE 3000 END`,
      );
    });
  });
  afterAll(async () => {
    await app?.close();
    if (db?.isInitialized) await db.destroy();
  });
  it('autentica ambos roles con JWT verificable y no devuelve credenciales', async () => {
    const r = await request(servidor())
      .post('/auth/login')
      .send({ nombre: 'administrador', contrasena: 'administrador123' });
    expect(r.status).toBe(200);
    expect(Object.keys(r.body).sort()).toEqual(['rol', 'token']);
    expect(r.body.rol).toBe('ADMINISTRADOR');
    expect(jwt.verify(r.body.token, SECRETO_PRUEBA)).toMatchObject({
      sub: 'administrador',
      rol: 'ADMINISTRADOR',
    });
  });
  it.each(['ADMINISTRADOR', 'OPERADOR'] as const)(
    'consulta el rol de la sesión %s con JWT real y sin caché',
    async (rol) => {
      const token = rol === 'ADMINISTRADOR' ? tokenAdmin : tokenOperador;
      await request(servidor())
        .get('/auth/sesion')
        .set('Authorization', `Bearer ${token}`)
        .expect('Cache-Control', 'no-store')
        .expect(200, { rol });
    },
  );

  it('rechaza sesión ausente, inválida y vencida', async () => {
    const vencido = jwt.sign(
      { sub: 'administrador', rol: 'ADMINISTRADOR' },
      SECRETO_PRUEBA,
      { expiresIn: -1 },
    );
    for (const token of [undefined, 'invalido', vencido]) {
      const solicitud = request(servidor()).get('/auth/sesion');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const r = await solicitud;
      expect(r.status).toBe(401);
      expect(r.body.codigo).toBe('UNAUTHORIZED');
    }
  });

  it('no revela si el usuario o la contraseña son incorrectos', async () => {
    const a = await request(servidor())
      .post('/auth/login')
      .send({ nombre: 'no-existe', contrasena: 'incorrecta' });
    const b = await request(servidor())
      .post('/auth/login')
      .send({ nombre: 'administrador', contrasena: 'incorrecta' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });
  it.each([
    {},
    { nombre: 'administrador' },
    { nombre: 4, contrasena: 'x' },
    { nombre: '', contrasena: 'x' },
    { nombre: 'admin', contrasena: 'x', rol: 'ADMINISTRADOR' },
  ])('valida login: %j', async (cuerpo) => {
    const r = await request(servidor()).post('/auth/login').send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({
      codigo: 'BAD_REQUEST',
      motivo: expect.any(String),
    });
  });
  it.each(CONSULTAS)('consulta datos persistidos en %s', async (ruta) => {
    const r = await request(servidor()).get(ruta).set(admin());
    expect(r.status).toBe(200);
    if (ruta.endsWith('cupos'))
      expect(r.body.cupos).toContainEqual({ tipoVehiculo: 'CARRO', maximo: 3 });
    if (ruta.endsWith('umbral')) expect(r.body.umbral).toBe(0.8);
    if (ruta.endsWith('tarifas')) {
      expect(r.body.tarifas).toHaveLength(4);
      expect(r.body.franja).toEqual({ inicioHora: 6, finHora: 18 });
    }
  });
  it.each(ESCRITURAS)(
    'guarda y recupera realmente $ruta',
    async ({ ruta, cuerpo }) => {
      const r = await request(servidor()).put(ruta).set(admin()).send(cuerpo);
      expect(r.status).toBe(200);
      const consulta = await request(servidor())
        .get(ruta.endsWith('franja') ? '/configuracion/tarifas' : ruta)
        .set(admin());
      if (ruta.endsWith('franja')) expect(consulta.body.franja).toEqual(cuerpo);
      else
        for (const [campo, valor] of Object.entries(cuerpo)) {
          if (Array.isArray(valor))
            expect(consulta.body[campo]).toEqual(expect.arrayContaining(valor));
          else expect(consulta.body[campo]).toBe(valor);
        }
      const tabla = ruta.endsWith('cupos')
        ? 'cupo'
        : ruta.endsWith('umbral')
          ? 'parametro_sede'
          : ruta.endsWith('franja')
            ? 'franja'
            : 'tarifa';
      expect(
        (await db!.query(`SELECT * FROM ${tabla}`)).length,
      ).toBeGreaterThan(0);
    },
  );
  const operaciones = [
    ...CONSULTAS.map((ruta) => ({ metodo: 'get' as const, ruta, cuerpo: {} })),
    ...ESCRITURAS.map((e) => ({ metodo: 'put' as const, ...e })),
  ];
  it.each(operaciones)(
    'protege $metodo $ruta sin token, con token alterado, vencido y rol operador',
    async ({ metodo, ruta, cuerpo }) => {
      const vencido = jwt.sign(
        { sub: 'administrador', rol: 'ADMINISTRADOR' },
        SECRETO_PRUEBA,
        { expiresIn: -1 },
      );
      for (const token of [undefined, 'token-invalido', vencido]) {
        const peticion = request(servidor())[metodo](ruta);
        if (token) peticion.set('Authorization', `Bearer ${token}`);
        const r = await peticion.send(cuerpo);
        expect(r.status).toBe(401);
        expect(r.body.codigo).toBe('UNAUTHORIZED');
      }
      const solicitudOperador = request(servidor())[metodo](ruta);
      const r = await solicitudOperador
        .set('Authorization', `Bearer ${tokenOperador}`)
        .send(cuerpo);
      expect(r.status).toBe(403);
      expect(r.body.codigo).toBe('FORBIDDEN');
      expect(
        (await request(servidor()).get('/configuracion/cupos').set(admin()))
          .body.cupos,
      ).toContainEqual({ tipoVehiculo: 'CARRO', maximo: 3 });
    },
  );
  it.each([
    { ruta: '/configuracion/cupos', cuerpo: { cupos: [] } },
    {
      ruta: '/configuracion/cupos',
      cuerpo: { cupos: [{ tipoVehiculo: 'CARRO', maximo: -1 }] },
    },
    {
      ruta: '/configuracion/cupos',
      cuerpo: { cupos: [{ tipoVehiculo: 'CARRO', maximo: 1.5 }] },
    },
    {
      ruta: '/configuracion/cupos',
      cuerpo: { cupos: [{ tipoVehiculo: 'CARRO', maximo: 2147483648 }] },
    },
    {
      ruta: '/configuracion/cupos',
      cuerpo: { cupos: [{ tipoVehiculo: 'OTRO', maximo: 1 }] },
    },
    {
      ruta: '/configuracion/cupos',
      cuerpo: {
        cupos: [
          { tipoVehiculo: 'CARRO', maximo: 1 },
          { tipoVehiculo: 'CARRO', maximo: 2 },
        ],
      },
    },
    { ruta: '/configuracion/umbral', cuerpo: { umbral: -0.01 } },
    { ruta: '/configuracion/umbral', cuerpo: { umbral: 1.01 } },
    { ruta: '/configuracion/umbral', cuerpo: { umbral: '0.8' } },
    { ruta: '/configuracion/umbral', cuerpo: { umbral: 0.8, extra: true } },
    { ruta: '/configuracion/tarifas', cuerpo: { tarifas: [] } },
    {
      ruta: '/configuracion/tarifas',
      cuerpo: {
        tarifas: [{ tipoVehiculo: 'CARRO', franja: 'OTRA', valor: 1 }],
      },
    },
    {
      ruta: '/configuracion/tarifas',
      cuerpo: {
        tarifas: [{ tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: -1 }],
      },
    },
    {
      ruta: '/configuracion/tarifas',
      cuerpo: {
        tarifas: [
          { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 6000, extra: true },
        ],
      },
    },
    {
      ruta: '/configuracion/franja',
      cuerpo: { inicioHora: 6, finHora: 18, extra: true },
    },
  ])('rechaza entrada inválida en $ruta: $cuerpo', async ({ ruta, cuerpo }) => {
    const antes = await request(servidor())
      .get(ruta.endsWith('franja') ? '/configuracion/tarifas' : ruta)
      .set(admin());
    const r = await request(servidor()).put(ruta).set(admin()).send(cuerpo);
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe('BAD_REQUEST');
    expect(
      (
        await request(servidor())
          .get(ruta.endsWith('franja') ? '/configuracion/tarifas' : ruta)
          .set(admin())
      ).body,
    ).toEqual(antes.body);
  });
  it('rechaza RN-02 parcial e igualdad y conserva las tarifas', async () => {
    for (const valor of [5000, 6000]) {
      const r = await request(servidor())
        .put('/configuracion/tarifas')
        .set(admin())
        .send({
          tarifas: [{ tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor }],
        });
      expect(r.status).toBe(422);
      expect(r.body.codigo).toBe('TARIFA_INVALIDA');
    }
    expect(
      (await request(servidor()).get('/configuracion/tarifas').set(admin()))
        .body.tarifas,
    ).toContainEqual({
      tipoVehiculo: 'CARRO',
      franja: 'NOCTURNA',
      valor: 3000,
    });
  });

  it.each(['cupos', 'tarifas'] as const)(
    'revierte el lote HTTP de %s si falla una escritura posterior',
    async (recurso) => {
      const esCupo = recurso === 'cupos';
      const tabla = esCupo ? 'cupo' : 'tarifa';
      const condicion = esCupo
        ? "NEW.tipo = 'MOTO' AND NEW.maximo = 999"
        : "NEW.tipo_vehiculo = 'CARRO' AND NEW.franja = 'NOCTURNA' AND NEW.valor = 4444";
      const cuerpo = esCupo
        ? {
            cupos: [
              { tipoVehiculo: 'CARRO', maximo: 20 },
              { tipoVehiculo: 'MOTO', maximo: 999 },
            ],
          }
        : {
            tarifas: [
              { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 7000 },
              { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 4444 },
            ],
          };
      const ruta = `/configuracion/${recurso}`;
      const antes = await request(servidor()).get(ruta).set(admin());
      await db!.query(
        `CREATE FUNCTION fallo_http_prueba() RETURNS trigger AS $$ BEGIN IF ${condicion} THEN RAISE EXCEPTION 'detalle privado del fallo de prueba'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
      );
      await db!.query(
        `CREATE TRIGGER fallo_http_prueba BEFORE INSERT OR UPDATE ON ${tabla} FOR EACH ROW EXECUTE FUNCTION fallo_http_prueba()`,
      );
      try {
        const r = await request(servidor()).put(ruta).set(admin()).send(cuerpo);
        expect(r.status).toBe(500);
        expect(r.body).toEqual({
          codigo: 'ERROR_INTERNO',
          motivo: 'Error interno del servidor',
        });
        expect((await request(servidor()).get(ruta).set(admin())).body).toEqual(
          antes.body,
        );
      } finally {
        await db!.query(`DROP TRIGGER IF EXISTS fallo_http_prueba ON ${tabla}`);
        await db!.query('DROP FUNCTION IF EXISTS fallo_http_prueba()');
      }
    },
  );
  it.each([
    { inicioHora: 24, finHora: 24 },
    { inicioHora: -1, finHora: 18 },
    { inicioHora: 6, finHora: 25 },
  ])(
    'rechaza por dominio un horario entero fuera de rango: %j',
    async (cuerpo) => {
      const r = await request(servidor())
        .put('/configuracion/franja')
        .set(admin())
        .send(cuerpo);
      expect(r.status).toBe(422);
      expect(r.body.codigo).toBe('FRANJA_INVALIDA');
      expect(
        (await request(servidor()).get('/configuracion/tarifas').set(admin()))
          .body.franja,
      ).toEqual({ inicioHora: 6, finHora: 18 });
    },
  );

  it('admite gratuidad 0/0 y rechaza un horario incoherente con 422', async () => {
    expect(
      (
        await request(servidor())
          .put('/configuracion/tarifas')
          .set(admin())
          .send({
            tarifas: [
              { tipoVehiculo: 'CARRO', franja: 'DIURNA', valor: 0 },
              { tipoVehiculo: 'CARRO', franja: 'NOCTURNA', valor: 0 },
            ],
          })
      ).status,
    ).toBe(200);
    const r = await request(servidor())
      .put('/configuracion/franja')
      .set(admin())
      .send({ inicioHora: 18, finHora: 6 });
    expect(r.status).toBe(422);
    expect(r.body.codigo).toBe('FRANJA_INVALIDA');
  });
  it.each([0, 1])('acepta el límite de umbral %s', async (umbral) => {
    const r = await request(servidor())
      .put('/configuracion/umbral')
      .set(admin())
      .send({ umbral });
    expect(r.status).toBe(200);
    expect(r.body.umbral).toBe(umbral);
  });
  it('devuelve al operador ocupación y máximos sin contar estancias cerradas', async () => {
    const [carril]: { id: number; sede_id: number }[] = await db!.query(
      'SELECT id, sede_id FROM carril ORDER BY sede_id, id LIMIT 1',
    );
    const filas: { id: number }[] = await db!.query(
      `INSERT INTO estancia (placa, sede_id, carril_id, tipo_vehiculo, ingreso_en, salida_en)
       VALUES ('XYZ123', $1, $2, 'CARRO', '2026-11-19T12:00:00Z', NULL),
              ('XYZ12A', $1, $2, 'MOTO', '2026-11-19T12:00:00Z', NULL),
              ('XYZ456', $1, $2, 'CARRO', '2026-11-19T12:00:00Z', '2026-11-19T13:00:00Z')
       RETURNING id`,
      [carril.sede_id, carril.id],
    );
    try {
      const respuesta = await request(servidor())
        .get('/carril/ocupacion')
        .set('Authorization', `Bearer ${tokenOperador}`)
        .expect('Cache-Control', 'no-store')
        .expect(200);
      expect(respuesta.body).toEqual({
        cupos: [
          { tipoVehiculo: 'CARRO', ocupacion: 1, maximo: 3 },
          { tipoVehiculo: 'MOTO', ocupacion: 1, maximo: 5 },
        ],
      });
    } finally {
      await db!.query('DELETE FROM estancia WHERE id = ANY($1::int[])', [
        filas.map((fila) => fila.id),
      ]);
    }
  });

  it('protege ocupación ante token ausente, inválido, vencido y rol administrador', async () => {
    const vencido = jwt.sign(
      { sub: 'operador', rol: 'OPERADOR' },
      SECRETO_PRUEBA,
      { expiresIn: -1 },
    );
    for (const token of [undefined, 'invalido', vencido]) {
      const solicitud = request(servidor()).get('/carril/ocupacion');
      if (token) solicitud.set('Authorization', `Bearer ${token}`);
      const respuesta = await solicitud;
      expect(respuesta.status).toBe(401);
      expect(respuesta.body).toEqual({
        codigo: 'UNAUTHORIZED',
        motivo: expect.any(String),
      });
    }
    const respuesta = await request(servidor())
      .get('/carril/ocupacion')
      .set(admin());
    expect(respuesta.status).toBe(403);
    expect(respuesta.body).toEqual({
      codigo: 'FORBIDDEN',
      motivo: expect.any(String),
    });
  });

  it('simula llegada con JWT de operador y el sensor real de la aplicación', async () => {
    const estado = app!.get(EstadoCarrilStore);
    await estado.guardar(estadoCarrilInicial());
    try {
      await request(servidor())
        .post('/carril/simulacion/llegada')
        .set('Authorization', `Bearer ${tokenOperador}`)
        .expect(200, { vehiculoPresente: true });
      expect(await estado.obtener()).toEqual({
        ...estadoCarrilInicial(),
        vehiculoPresente: true,
      });
      await request(servidor())
        .post('/carril/simulacion/llegada')
        .set(admin())
        .expect(403);
      await request(servidor()).post('/carril/simulacion/llegada').expect(401);
    } finally {
      await estado.guardar(estadoCarrilInicial());
    }
  });

  it('consulta presencia, barrera y último resultado sin caché en menos de un segundo local', async () => {
    const estado = app!.get(EstadoCarrilStore);
    const actual = {
      ...estadoCarrilInicial(),
      vehiculoPresente: true,
      ultimoResultado: { resultado: 'RECHAZADO' as const, motivo: 'LLENO' },
      barrera: { estado: 'CERRADA' as const, motivo: 'LLENO' },
    };
    await estado.guardar(actual);
    try {
      const duraciones: number[] = [];
      for (let intento = 0; intento < 5; intento++) {
        const inicio = performance.now();
        await request(servidor())
          .get('/carril/estado')
          .set('Authorization', `Bearer ${tokenOperador}`)
          .expect('Cache-Control', 'no-store')
          .expect(200, { ...actual, simulacionHabilitada: true });
        duraciones.push(performance.now() - inicio);
      }
      const maximo = Math.max(...duraciones);
      console.info(
        `CARQ-142: máximo local de 5 consultas = ${maximo.toFixed(2)} ms`,
      );
      expect(maximo).toBeLessThan(1000);
      expect(await estado.obtener()).toEqual(actual);
      await request(servidor()).get('/carril/estado').set(admin()).expect(403);
      await request(servidor()).get('/carril/estado').expect(401);
      const vencido = jwt.sign(
        { sub: 'operador', rol: 'OPERADOR' },
        SECRETO_PRUEBA,
        { expiresIn: -1 },
      );
      await request(servidor())
        .get('/carril/estado')
        .set('Authorization', `Bearer ${vencido}`)
        .expect(401);
    } finally {
      await estado.guardar(estadoCarrilInicial());
    }
  });

  it('mantiene un solo pago y una sola transición al repetir la referencia (CARQ-213)', async () => {
    const [{ id: cobroId, version: versionInicial }] = await db!.query<
      { id: number; version: string }[]
    >(
      `INSERT INTO cobro
         (placa, tipo_vehiculo, sede_id, dia_operativo, franja, tarifa_aplicada)
       SELECT 'CAR213', 'CARRO', id, '2026-11-19', 'DIURNA', 5000
       FROM sede WHERE nombre = 'Sede principal'
       RETURNING id, xmin::text AS version`,
    );
    const referencia = 'carq-213-pago-efectivo';
    const pagar = () =>
      request(servidor())
        .post('/pagos/efectivo')
        .set('Authorization', `Bearer ${tokenOperador}`)
        .send({ cobroId, referencia })
        .expect(200);
    const leerCobro = async () => {
      const [cobro] = await db!.query<{ estado: string; version: string }[]>(
        'SELECT estado, xmin::text AS version FROM cobro WHERE id = $1',
        [cobroId],
      );
      return cobro;
    };

    const primero = await pagar();
    expect(primero.body).toMatchObject({
      cobro: { id: cobroId, estado: 'PAGADO' },
      pago: { referencia, monto: 5000 },
    });
    const pagado = await leerCobro();
    expect(pagado.estado).toBe('PAGADO');
    expect(pagado.version).not.toBe(versionInicial);

    const segundo = await pagar();
    expect(segundo.body).toEqual(primero.body);
    // La versión de PostgreSQL cambia solo si se vuelve a escribir el cobro.
    await expect(leerCobro()).resolves.toEqual(pagado);
    const pagos = await db!.query<{ id: number; referencia: string }[]>(
      'SELECT id, referencia FROM pago WHERE cobro_id = $1',
      [cobroId],
    );
    expect(pagos).toEqual([{ id: primero.body.pago.id, referencia }]);
  });

  it('sirve Swagger y refleja todas las rutas de la aplicación real', async () => {
    const r = await request(servidor()).get('/docs-json');
    expect(r.status).toBe(200);
    const esperadas = [
      'post /auth/login',
      'get /auth/sesion',
      'get /cobros/pendientes',
      'post /pagos/efectivo',
      'get /consulta/eventos',
      'get /consulta/cobros',
      'get /carril/ocupacion',
      'get /carril/estado',
      'post /carril/ingreso',
      'post /carril/salida',
      'post /carril/simulacion/llegada',
      ...operaciones.map((o) => `${o.metodo} ${o.ruta}`),
    ].sort();
    const documentadas = Object.entries(r.body.paths)
      .flatMap(([ruta, path]) =>
        Object.keys(path as object)
          .filter((m) => ['get', 'post', 'put', 'delete', 'patch'].includes(m))
          .map((m) => `${m} ${ruta}`),
      )
      .sort();
    expect(documentadas).toEqual(esperadas);
    expect(r.body.paths['/carril/ocupacion'].get).toMatchObject({
      operationId: 'consultarOcupacion',
      security: [{ sesion: [] }],
      responses: {
        '200': {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OcupacionRespuestaDto' },
            },
          },
        },
        '401': expect.any(Object),
        '403': expect.any(Object),
      },
    });
    expect((await request(servidor()).get('/docs/')).status).toBe(200);
  });
  it('permite CORS del frontend configurado y no concede permiso a otro origen', async () => {
    const permitido = await request(servidor())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3002')
      .set('Access-Control-Request-Method', 'POST');
    expect(permitido.headers['access-control-allow-origin']).toBe(
      'http://localhost:3002',
    );
    const otro = await request(servidor())
      .options('/auth/login')
      .set('Origin', 'http://otro.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(otro.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('devuelve 404 con el contrato de errores para una ruta inexistente', async () => {
    const r = await request(servidor()).get('/ruta-inexistente');
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ codigo: 'NOT_FOUND', motivo: expect.any(String) });
  });
});

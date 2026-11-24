import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { LectorPlaca } from '../aplicacion/lector-placa';
import { LectorOcr } from './lector-ocr';

describe('LectorOcr (CARQ-89)', () => {
  let servidor: Server;
  let url: string;
  let cuerpo: unknown;
  let estado: number;
  let modo:
    'normal' | 'sin-cabeceras' | 'sin-cuerpo' | 'json-invalido' | 'cortar';
  let peticiones: {
    ruta: string;
    metodo: string;
    tipo: string;
    datos: Buffer;
  }[];
  beforeAll(async () => {
    servidor = createServer(async (req, res) => {
      const fragmentos: Buffer[] = [];
      for await (const fragmento of req) fragmentos.push(fragmento as Buffer);
      peticiones.push({
        ruta: req.url ?? '',
        metodo: req.method ?? '',
        tipo: req.headers['content-type'] ?? '',
        datos: Buffer.concat(fragmentos),
      });
      if (modo === 'sin-cabeceras') return;
      if (modo === 'cortar') {
        res.destroy();
        return;
      }
      res.writeHead(estado, { 'Content-Type': 'application/json' });
      if (modo === 'sin-cuerpo') {
        res.flushHeaders();
        return;
      }
      if (modo === 'json-invalido') {
        res.end('{');
        return;
      }
      res.end(JSON.stringify(cuerpo));
    });
    await new Promise<void>((resolver) =>
      servidor.listen(0, '127.0.0.1', resolver),
    );
    url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    servidor.closeAllConnections();
    await new Promise<void>((resolver, rechazar) =>
      servidor.close((error) => (error ? rechazar(error) : resolver())),
    );
  });
  beforeEach(() => {
    peticiones = [];
    cuerpo = { placa: 'ABC123', confianza: 0.91 };
    estado = 200;
    modo = 'normal';
  });

  it.each(['ABC123', 'ABC12A'])(
    'envía la imagen sin alterarla y devuelve %s con origen OCR',
    async (placa) => {
      cuerpo = { placa, confianza: 0.91 };
      const imagen = Buffer.from([0, 255, 8, 42, 4]);
      const lector: LectorPlaca = new LectorOcr(url);
      const lectura = await lector.leer({
        imagen,
        placa: 'XYZ987',
        confianza: 1,
      });
      expect(lectura.placa?.valor).toBe(placa);
      expect(lectura).toMatchObject({ origen: 'OCR', confianza: 0.91 });
      expect(peticiones).toHaveLength(1);
      const enviada = peticiones[0];
      expect(enviada).toMatchObject({ metodo: 'POST', ruta: '/read' });
      expect(enviada.tipo).toContain('multipart/form-data; boundary=');
      const formulario = await new Response(Uint8Array.from(enviada.datos), {
        headers: { 'Content-Type': enviada.tipo },
      }).formData();
      const archivo = formulario.get('imagen') as File;
      expect(Buffer.from(await archivo.arrayBuffer())).toEqual(imagen);
      expect([...formulario.keys()]).toEqual(['imagen']);
    },
  );

  it('normaliza mayúsculas, espacios y guiones sin aumentar la confianza', async () => {
    cuerpo = { placa: ' abc-12 a ', confianza: 0.31 };
    const lectura = await new LectorOcr(url).leer({
      imagen: Buffer.from('foto'),
    });
    expect(lectura.placa?.valor).toBe('ABC12A');
    expect(lectura.confianza).toBe(0.31);
  });

  it('conserva el prefijo de ruta de la URL configurada', async () => {
    await new LectorOcr(`${url}/lpr/`).leer({ imagen: Buffer.from('foto') });
    expect(peticiones[0].ruta).toBe('/lpr/read');
  });

  it.each([null, 'XX', '5AU5341', ''])(
    'devuelve placa nula cuando la detección es ausente o inválida: %s',
    async (placa) => {
      cuerpo = { placa, confianza: placa === null ? 0 : 0.9 };
      expect(
        await new LectorOcr(url).leer({ imagen: Buffer.from('foto') }),
      ).toEqual({ placa: null, confianza: 0, origen: 'OCR' });
    },
  );

  it.each([undefined, Buffer.alloc(0)])(
    'sin imagen no sustituye OCR por datos digitados',
    async (imagen) => {
      expect(
        await new LectorOcr(url).leer({
          imagen,
          placa: 'ABC123',
          confianza: 1,
        }),
      ).toEqual({ placa: null, confianza: 0, origen: 'OCR' });
      expect(peticiones).toHaveLength(0);
    },
  );

  it.each([
    null,
    [],
    {},
    { placa: 'ABC123' },
    { placa: 123, confianza: 1 },
    { placa: 'ABC123', confianza: '0.9' },
    { placa: 'ABC123', confianza: -1 },
    { placa: 'ABC123', confianza: 2 },
    { placa: null, confianza: 0.9 },
    { placa: 'A'.repeat(33), confianza: 0.9 },
  ])(
    'CARQ-90: contrato LPR inválido solicita lectura manual: %j',
    async (respuesta) => {
      cuerpo = respuesta;
      await expect(
        new LectorOcr(url).leer({ imagen: Buffer.from('foto') }),
      ).resolves.toEqual({ placa: null, confianza: 0, origen: 'OCR' });
    },
  );

  it('no interpreta un error HTTP como detección exitosa', async () => {
    estado = 503;
    await expect(
      new LectorOcr(url).leer({ imagen: Buffer.from('foto') }),
    ).resolves.toEqual({ placa: null, confianza: 0, origen: 'OCR' });
    expect(peticiones).toHaveLength(1);
  });

  it.each(['sin-cabeceras', 'sin-cuerpo', 'json-invalido', 'cortar'] as const)(
    'CARQ-90: %s devuelve lectura manual sin reintento',
    async (fallo) => {
      modo = fallo;
      await expect(
        new LectorOcr(url, 150).leer({ imagen: Buffer.from('foto') }),
      ).resolves.toEqual({ placa: null, confianza: 0, origen: 'OCR' });
      expect(peticiones).toHaveLength(1);
      servidor.closeAllConnections();
    },
  );

  it('CARQ-90: conexión rechazada devuelve lectura manual', async () => {
    const cerrado = createServer();
    await new Promise<void>((resolver) =>
      cerrado.listen(0, '127.0.0.1', resolver),
    );
    const puerto = (cerrado.address() as AddressInfo).port;
    await new Promise<void>((resolver) => cerrado.close(() => resolver()));
    await expect(
      new LectorOcr(`http://127.0.0.1:${puerto}`).leer({
        imagen: Buffer.from('foto'),
      }),
    ).resolves.toEqual({ placa: null, confianza: 0, origen: 'OCR' });
  });

  it.each(['', 'no-es-url', 'file:///tmp/modelo'])(
    'rechaza URL inválida sin exponerla: %s',
    (direccion) => {
      expect(() => new LectorOcr(direccion)).toThrow(
        'La URL del servicio LPR debe ser HTTP o HTTPS',
      );
    },
  );
});

import { pino } from 'pino';
import { RUTAS_CENSURADAS, TEXTO_CENSURADO } from './rutas-censuradas';

function registrar(objeto: object): string {
  let salida = '';
  const logger = pino(
    { redact: { paths: RUTAS_CENSURADAS, censor: TEXTO_CENSURADO } },
    {
      write: (linea: string) => {
        salida += linea;
      },
    },
  );
  logger.info(objeto, 'prueba');
  return salida;
}

describe('rutas censuradas del log', () => {
  it('censura el token de la cabecera authorization', () => {
    const salida = registrar({
      req: { headers: { authorization: 'Bearer secreto-123' } },
    });
    expect(salida).not.toContain('secreto-123');
    expect(salida).toContain(TEXTO_CENSURADO);
  });

  it('censura la contraseña del cuerpo de la petición', () => {
    const salida = registrar({ req: { body: { password: 'clave-456' } } });
    expect(salida).not.toContain('clave-456');
    expect(salida).toContain(TEXTO_CENSURADO);
  });

  it('no censura los campos que no son secretos', () => {
    const salida = registrar({ req: { method: 'GET' } });
    expect(salida).toContain('GET');
  });
});
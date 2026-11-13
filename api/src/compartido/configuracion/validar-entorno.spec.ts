import { validarEntorno } from './validar-entorno';

const entornoValido = {
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

describe('validarEntorno', () => {
  it('acepta un entorno completo y aplica los valores por defecto', () => {
    const entorno = validarEntorno(entornoValido);

    expect(entorno.NODE_ENV).toBe('development');
    expect(entorno.PUERTO).toBe(3000);
    expect(entorno.JWT_EXPIRACION).toBe('8h');
    expect(entorno.ZONA_HORARIA).toBe('America/Bogota');
  });

  it('falla si falta una variable obligatoria', () => {
    const incompleto = { ...entornoValido, JWT_SECRETO: undefined };

    expect(() => validarEntorno(incompleto)).toThrow(
      'JWT_SECRETO es obligatoria',
    );
  });

  it('falla si falta la URL del web', () => {
    const incompleto = { ...entornoValido, URL_WEB: undefined };

    expect(() => validarEntorno(incompleto)).toThrow('URL_WEB es obligatoria');
  });

  it('informa todas las variables faltantes juntas', () => {
    expect(() => validarEntorno({})).toThrow(
      /URL_BASE_DATOS[\s\S]*JWT_SECRETO/,
    );
  });

  it('rechaza un valor fuera de la lista cerrada', () => {
    expect(() =>
      validarEntorno({ ...entornoValido, LECTOR_PLACAS: 'ocr' }),
    ).toThrow('LECTOR_PLACAS debe ser uno de');
  });

  it('rechaza una zona horaria inválida', () => {
    expect(() =>
      validarEntorno({ ...entornoValido, ZONA_HORARIA: 'Marte/Olimpo' }),
    ).toThrow('ZONA_HORARIA no es una zona horaria válida');
  });

  it('rechaza un inicio de día operativo mal formado', () => {
    expect(() =>
      validarEntorno({ ...entornoValido, INICIO_DIA_OPERATIVO: '6am' }),
    ).toThrow('INICIO_DIA_OPERATIVO debe tener formato HH:mm');
  });

  it('rechaza un puerto fuera de rango', () => {
    expect(() =>
      validarEntorno({ ...entornoValido, PUERTO: '70000' }),
    ).toThrow('PUERTO debe ser un puerto válido');
  });
});
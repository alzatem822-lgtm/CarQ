const ENTORNOS = ['development', 'test', 'production'] as const;
const LECTORES = ['simulado', 'manual', 'http'] as const;
const FUENTES = ['simulado', 'mqtt'] as const;

export type Entorno = {
  NODE_ENV: (typeof ENTORNOS)[number];
  PUERTO: number;
  ZONA_HORARIA: string;
  INICIO_DIA_OPERATIVO: string;
  LECTOR_PLACAS: (typeof LECTORES)[number];
  FUENTE_SENSOR: (typeof FUENTES)[number];
  CONTROLADOR_BARRERA: (typeof FUENTES)[number];
  URL_BASE_DATOS: string;
  URL_REDIS: string;
  URL_MQTT: string;
  URL_LPR: string;
  JWT_SECRETO: string;
  JWT_EXPIRACION: string;
};

export function validarEntorno(crudo: Record<string, unknown>): Entorno {
  const errores: string[] = [];

  const texto = (nombre: string, porDefecto?: string): string => {
    const valor = crudo[nombre];
    if (typeof valor === 'string' && valor.trim() !== '') return valor.trim();
    if (porDefecto !== undefined) return porDefecto;
    errores.push(`${nombre} es obligatoria`);
    return '';
  };

  const opcion = <T extends string>(
    nombre: string,
    validas: readonly T[],
    porDefecto?: T,
  ): T => {
    const valor = texto(nombre, porDefecto);
    if (valor !== '' && !validas.includes(valor as T)) {
      errores.push(`${nombre} debe ser uno de: ${validas.join(', ')}`);
    }
    return valor as T;
  };

  const puerto = Number(texto('PUERTO', '3000'));
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    errores.push('PUERTO debe ser un puerto válido (1-65535)');
  }

  const zonaHoraria = texto('ZONA_HORARIA');
  if (zonaHoraria !== '') {
    try {
      new Intl.DateTimeFormat('es', { timeZone: zonaHoraria });
    } catch {
      errores.push('ZONA_HORARIA no es una zona horaria válida');
    }
  }

  const inicioDia = texto('INICIO_DIA_OPERATIVO');
  if (inicioDia !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicioDia)) {
    errores.push('INICIO_DIA_OPERATIVO debe tener formato HH:mm');
  }

  const entorno: Entorno = {
    NODE_ENV: opcion('NODE_ENV', ENTORNOS, 'development'),
    PUERTO: puerto,
    ZONA_HORARIA: zonaHoraria,
    INICIO_DIA_OPERATIVO: inicioDia,
    LECTOR_PLACAS: opcion('LECTOR_PLACAS', LECTORES),
    FUENTE_SENSOR: opcion('FUENTE_SENSOR', FUENTES),
    CONTROLADOR_BARRERA: opcion('CONTROLADOR_BARRERA', FUENTES),
    URL_BASE_DATOS: texto('URL_BASE_DATOS'),
    URL_REDIS: texto('URL_REDIS'),
    URL_MQTT: texto('URL_MQTT'),
    URL_LPR: texto('URL_LPR'),
    JWT_SECRETO: texto('JWT_SECRETO'),
    JWT_EXPIRACION: texto('JWT_EXPIRACION', '8h'),
  };

  if (errores.length > 0) {
    throw new Error(`Configuración inválida:\n- ${errores.join('\n- ')}`);
  }
  return entorno;
}
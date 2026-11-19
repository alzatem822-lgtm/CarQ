import { limpiarSesion, obtenerToken } from './sesion';

const URL_API = process.env.NEXT_PUBLIC_URL_API ?? 'http://localhost:3001';

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly cuerpo: unknown,
  ) {
    super(`Error ${estado} de la API`);
    this.name = 'ErrorApi';
  }
}

export async function peticion<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const token = obtenerToken();
  const headers = new Headers(opciones.headers);
  if (opciones.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    headers,
    signal: opciones.signal ?? AbortSignal.timeout(20000),
  });

  // Un 401 con sesión activa significa token vencido o inválido.
  // Sin token (por ejemplo, contraseña mala en el login) no se redirige.
  if (
    respuesta.status === 401 &&
    token &&
    !opciones.signal?.aborted &&
    token === obtenerToken()
  ) {
    limpiarSesion();
    // Fuera de React no hay router; la recarga completa también reinicia el estado.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
  return cuerpo as T;
}

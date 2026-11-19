# CarQ · Backend y Swagger

API NestJS de autenticación y configuración para una sede. El contrato OpenAPI se genera desde los controladores y DTO; no depende de un archivo mantenido a mano.

## Abrir la documentación

Desde la raíz del repositorio, con `.env` configurado:

```powershell
docker compose up -d --build api
```

- Swagger UI: <http://localhost:3001/docs/>
- OpenAPI JSON: <http://localhost:3001/docs-json>
- OpenAPI YAML: <http://localhost:3001/docs-yaml>

El puerto 3001 es el puerto publicado de la API; el 3000 corresponde al frontend. `GET /` no es una página de bienvenida y devuelve 404.

En una instalación nueva, prepara primero la base y los datos iniciales. Desde `api`, con Node 24 y dependencias instaladas:

```powershell
npm ci
npm run migracion:ejecutar
npm run seed:ejecutar
```

La CLI usa `URL_BASE_DATOS_MIGRACIONES` si está definida. Para ejecutar esos comandos desde Windows debe apuntar al PostgreSQL accesible desde Windows, no al nombre interno `db` de Docker. La API en Docker usa `URL_BASE_DATOS`. Consulta `.env.example`; no publiques `.env`.

## Probar desde Swagger

1. Abre `POST /auth/login`, pulsa **Try it out** y sustituye la contraseña de ejemplo por la de tu cuenta.
2. En la base de desarrollo creada con los seeds existen `administrador` / `administrador123` y `operador` / `operador123`. Son credenciales de demostración, no cuentas para producción.
3. Ejecuta el login y copia el campo `token` de la respuesta 200.
4. Pulsa **Authorize**, pega únicamente el token (sin escribir `Bearer`) y confirma.
5. Ejecuta las consultas GET antes de modificar valores. Anota la configuración original.
6. Ejecuta un PUT válido y vuelve a consultar para comprobar la persistencia.
7. Prueba datos inválidos. Un rechazo no debe cambiar la configuración.
8. Usa **Authorize → Logout** para retirar la autorización. Repite con el token del operador: las operaciones de configuración deben responder 403.
9. Restaura los valores originales al terminar la demostración.

Swagger agrega la cabecera `Authorization: Bearer <token>`. No conserva el token al recargar la documentación ni envía el contrato a un validador externo. Las operaciones PUT de Swagger modifican la base configurada, igual que el frontend.

## Operaciones implementadas

| Método | Ruta | Acceso | Resultado |
|---|---|---|---|
| POST | `/auth/login` | Público | Token y rol |
| GET | `/configuracion/cupos` | ADMINISTRADOR | Capacidad por tipo |
| PUT | `/configuracion/cupos` | ADMINISTRADOR | Actualización atómica del lote |
| GET | `/configuracion/umbral` | ADMINISTRADOR | Umbral vigente |
| PUT | `/configuracion/umbral` | ADMINISTRADOR | Umbral persistido |
| GET | `/configuracion/tarifas` | ADMINISTRADOR | Tarifas y horario diurno |
| PUT | `/configuracion/tarifas` | ADMINISTRADOR | Actualización de tarifas |
| PUT | `/configuracion/franja` | ADMINISTRADOR | Horario diurno persistido |

Todos los éxitos anteriores devuelven 200. No hay endpoints de carril, cobro, pago ni consulta operativa en este incremento. La documentación no los presenta como disponibles.

## Contratos y reglas

- Los errores tienen forma `{ "codigo": "...", "motivo": "..." }`.
- **400:** cuerpo inválido, campos adicionales, tipos incorrectos, duplicados o valores fuera del rango del DTO.
- **401:** credenciales incorrectas en login o ausencia de un token válido en una ruta protegida.
- **403:** usuario autenticado sin el rol requerido.
- **404:** ruta inexistente.
- **422:** violación de una regla de dominio, como `TARIFA_INVALIDA` o `FRANJA_INVALIDA`.
- **500:** error interno con mensaje genérico; las trazas no forman parte de la respuesta.

Los cupos son enteros entre 0 y 2147483647. Configuran capacidad, no ocupación. Se actualizan solo los tipos incluidos y el lote se confirma o revierte como unidad.

El umbral pertenece a `[0,1]` y PostgreSQL lo conserva con precisión de dos decimales. La respuesta devuelve el valor persistido, que puede estar redondeado.

Las tarifas son COP enteros no negativos. Se exige nocturna menor que diurna, con la decisión del equipo de permitir gratuidad 0/0. Un PUT parcial se valida junto a los valores actuales. No se admiten pares tipo/franja repetidos.

El horario usa horas enteras: inicio de 0 a 23 y fin de 1 a 24, con inicio menor que fin. El inicio es inclusivo y el fin exclusivo. `[6,18)` incluye las 06:00 y deja de ser diurno a las 18:00.

## Pruebas reproducibles

Desde `api`:

```powershell
npm run lint
npm run build
npm test -- --runInBand
npm run test:swagger
```

Para integración, prepara los servicios aislados desde la raíz:

```powershell
docker compose --profile pruebas up -d db_pruebas redis_pruebas
```

Comprueba `URL_BASE_DATOS_PRUEBAS` y `URL_REDIS_PRUEBAS` en `.env`. La base debe terminar en `_pruebas`. Estas pruebas limpian exclusivamente esa base y no deben ejecutarse contra los datos de la demostración.

Desde `api`:

```powershell
npm run test:api
npm run test:integracion
```

`test:api` recorre la aplicación real, con sus módulos de composición, PostgreSQL, bcrypt, JWT, permisos, validación y configuración HTTP. `test:integracion` incluye además las pruebas de repositorios, migraciones, semillas y Redis. Se ejecutan en serie porque comparten la base de pruebas.

Consulta [la matriz de pruebas](docs/PRUEBAS_BACKEND.md) para conocer la cobertura y [la guía de entrega](docs/ENTREGA_SWAGGER.md) para preparar la rama y los commits.

## Si no funciona

- `/docs/` devuelve 404: reconstruye la API con el código actual y revisa `docker compose logs --tail=100 api`.
- El frontend no conecta: `URL_WEB` debe coincidir exactamente con su origen, por ejemplo `http://localhost:3002`. Recrea el contenedor API después de cambiar `.env`.
- Swagger abre pero una operación devuelve 401: vuelve a iniciar sesión y sustituye el token en **Authorize**.
- Configuración devuelve 403: utiliza una cuenta ADMINISTRADOR.
- No existen usuarios o parámetros: revisa la ejecución de migraciones y seeds sobre la base correcta.

Referencia de implementación: [OpenAPI de NestJS](https://docs.nestjs.com/openapi/introduction).

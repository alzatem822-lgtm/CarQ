# Matriz de pruebas del backend

Esta matriz corresponde a las nueve operaciones publicadas de autenticación y configuración, incluida la consulta de sesión incorporada desde develop. Una prueba satisfactoria acredita su escenario, no la ausencia de cualquier defecto posible.

## Resultado de la verificación de esta entrega

Ejecutada el 18 de noviembre de 2026 (America/Bogota):

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Aprobado |
| `npm run build` | Aprobado |
| `npm test -- --runInBand` | 48 suites y 219 pruebas aprobadas |
| `npm run test:integracion` | 10 suites y 76 pruebas aprobadas |
| Recorrido HTTP de la aplicación real | 46 escenarios integrados aprobados, incluidos los ocho endpoints |
| `npm audit --omit=dev` | Sin vulnerabilidades reportadas en dependencias de producción |

La API Docker existente no se reconstruyó desde la sesión de trabajo porque el acceso al motor estaba denegado. Para activar esta versión se debe ejecutar `docker compose up -d --build api` desde la raíz del proyecto.

## Cobertura por operación

Verificación posterior a la integración de `origin/develop`, el 19 de noviembre de 2026: 226 pruebas generales del backend, 90 de integración y 4 del frontend aprobadas. El backend compila y su lint está aprobado. Los resultados de la tabla anterior corresponden a la entrega inicial del día 18.

| Operación | Éxito | Validación y rechazo | Persistencia / contrato |
|---|---|---|---|
| POST `/auth/login` | Usuarios administrador y operador; JWT verificable | Credenciales incorrectas, cuerpo incompleto, vacío, tipos incorrectos y campos extra | Contraseñas verificadas con bcrypt contra PostgreSQL; respuesta sin credenciales |
| GET `/auth/sesion` | Ambos roles con JWT verificado | Token ausente, inválido o vencido | Solo devuelve el rol, sin token nuevo; respuesta `Cache-Control: no-store` |
| GET `/configuracion/cupos` | Lectura de cupos iniciales | Sin token, token inválido o vencido y operador | Valores de PostgreSQL; esquema OpenAPI |
| PUT `/configuracion/cupos` | Lote válido y lectura posterior | Vacío, negativo, decimal, exceso de INTEGER, tipo desconocido o repetido; permisos | Rollback real si falla una escritura posterior; 500 sin detalle interno |
| GET `/configuracion/umbral` | Umbral inicial | Sin token, token inválido o vencido y operador | Lectura de PostgreSQL; esquema OpenAPI |
| PUT `/configuracion/umbral` | Actualización y límites 0 y 1 | Fuera de rango, texto, campos extra; permisos | Consulta posterior y precisión de almacenamiento |
| GET `/configuracion/tarifas` | Cuatro tarifas y horario | Sin token, token inválido o vencido y operador | Datos reales y respuesta anidada |
| PUT `/configuracion/tarifas` | Cambios válidos, parciales y gratuidad 0/0 | Lista vacía, tipo/franja incorrectos, valores negativos o no enteros, duplicados, campos extra y RN-02; permisos | Consulta posterior, conservación ante rechazo y rollback real ante fallo posterior |
| PUT `/configuracion/franja` | Intervalo válido y lectura posterior | Rangos incorrectos, tipos y campos extra; inicio mayor o igual al fin; permisos | PostgreSQL y respuesta 422 con FRANJA_INVALIDA |

Las suites de controladores y casos de uso complementan los escenarios de integración, incluidos números no numéricos, conservación de otros tipos y propagación de fallos.

## Documentación y configuración HTTP

- Swagger UI en `/docs/`, sus archivos CSS/JS y los contratos `/docs-json` y `/docs-yaml` responden correctamente con Helmet activo.
- Se verifican nueve operaciones documentadas, identificadores únicos y respuestas de éxito/error.
- Login es público; la consulta de sesión y las siete operaciones de configuración declaran JWT. La consulta de sesión admite ambos roles; la configuración exige ADMINISTRADOR.
- Los esquemas anidados conservan límites, campos obligatorios y rechazo de propiedades adicionales.
- La contraseña se documenta como dato de entrada; no aparece en el DTO de respuesta.
- El token no se conserva al recargar Swagger y el contrato no se envía al validador público.
- El origen CORS configurado recibe permiso; otro origen no recibe la cabecera de autorización CORS.
- Las rutas inexistentes devuelven 404 con `{codigo,motivo}`.

## Ejecutar

```powershell
npm run lint
npm run build
npm test -- --runInBand
npm run test:api
npm run test:integracion
```

Las pruebas integradas arrancan la aplicación real y aplican la misma configuración HTTP que `main.ts`. Preparan migraciones y semillas en PostgreSQL de pruebas. Los fallos de escritura se fuerzan con triggers temporales, retirados en bloques `finally`.

No ejecutes dos suites de integración en paralelo sobre la misma base. Los scripts ya usan `--runInBand` dentro de cada ejecución.

## Límites de esta entrega

- No se afirma funcionamiento de endpoints que aún no existen.
- Las pruebas HTTP automatizadas comprueban publicación y recursos de Swagger, pero no sustituyen una revisión visual del navegador.
- La duración que muestra Swagger es orientativa e incluye el recorrido del cliente; no constituye un estudio de carga ni acredita un SLA.
- Las pruebas usan la infraestructura de pruebas. No modifican ni certifican los datos actuales de la base de demostración.

# CARQ-62 · Consulta y actualización de cupos

## Alcance

`GET /configuracion/cupos` y `PUT /configuracion/cupos`, con acceso exclusivo de ADMINISTRADOR. Se configura la capacidad máxima por tipo; ocupación y LLENO pertenecen al carril.

El defecto original de atomicidad ya estaba corregido en develop al comenzar esta revisión: el controlador envía el lote completo a `ActualizarCupo.ejecutarVarios` y el repositorio lo escribe mediante una única transacción. Esta entrega refuerza la validación de cada elemento como objeto y agrega una suite específica de aceptación con PostgreSQL real.

## Trazabilidad de aceptación

| Criterio | Comprobación |
|---|---|
| Administrador consulta y guarda CARRO/MOTO con máximos enteros no negativos | GET inicial y PUT de ambos tipos, incluyendo capacidad cero; verificación HTTP y SQL |
| Consulta posterior y reinicio conservan los valores | Se guarda, se cierra la aplicación Nest, se crea otra instancia y se consulta la misma base |
| Datos inválidos se rechazan con 400 y `{codigo,motivo}` | Cuerpo incompleto, lista vacía, elementos nulos/no objetos, negativos, decimales, texto, exceso de INTEGER, tipos desconocidos/repetidos y campos extra; se comprueba que ambos valores originales se conservan |
| Sin token válido: 401; sin rol: 403; sin escrituras | GET y PUT con token ausente, inválido, vencido y de operador, seguido de consulta de los cupos originales |
| El lote se confirma o revierte completo | Una restricción temporal en PostgreSQL hace fallar MOTO después de escribir CARRO; la respuesta es 500 genérica y ambos cupos conservan sus valores originales |
| Pruebas de consulta, actualización, validación, permisos y rollback | Suite HTTP específica, pruebas del controlador, caso de uso y repositorio, además de la suite integrada general |

La actualización parcial conserva el cupo de los tipos omitidos. Un máximo no puede superar 2147483647, límite de la columna INTEGER de PostgreSQL.

## Ejecutar

Desde la raíz, con los valores de pruebas configurados en `.env`:

```powershell
docker compose --profile pruebas up -d db_pruebas redis_pruebas
cd api
npm run lint
npm run build
npm test -- --runInBand --runTestsByPath src/modules/configuracion/adaptadores-entrada/cupos.controller.spec.ts src/modules/configuracion/aplicacion/actualizar-cupo.spec.ts
npm run test:integracion -- --runTestsByPath src/modules/configuracion/adaptadores-entrada/cupos.controller.integracion.spec.ts src/modules/configuracion/infraestructura/cupo-postgres.repository.integracion.spec.ts
```

Las pruebas limpian exclusivamente la base cuyo nombre termina en `_pruebas`. No se deben ejecutar sobre la base de demostración. El error provocado para verificar rollback es esperado; el resultado de la suite determina si la prueba pasó.

## Evidencia para Jira

Verificación ejecutada el 19 de noviembre de 2026: lint y compilación aprobados; 231 pruebas generales (48 suites) y 112 de integración (12 suites) aprobadas. La nueva suite específica de aceptación de CARQ-62 contiene 22 escenarios aprobados.

Adjuntar el PR, el resumen de ejecución de las pruebas y esta matriz a CARQ-62. Pasar el ticket a Terminado después de integrar el cambio y cumplir la revisión requerida por el equipo. No se modificaron el estado ni los criterios de aceptación de Jira desde esta entrega.

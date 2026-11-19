# Entrega de Swagger y pruebas del backend

## Rama

Los cambios requieren la implementación previa de tarifas, franja y cupos del trabajo de frontend. Antes de continuar, comprueba que los commits anteriores ya estén guardados y que no haya archivos preparados de otra tarea:

```powershell
cd C:\Users\Santc\Documents\ingSoft\CarQ
git status --short
git diff --cached --name-only
git switch -c fix/swagger-backend
```

El comando crea la rama desde la rama actual conservando los cambios sin confirmar. Si la rama actual es `fix/frontend-administracion`, Swagger heredará sus commits. Si ese trabajo aún no está integrado en `develop`, revisa inicialmente el PR de Swagger contra `fix/frontend-administracion`; cuando el anterior se integre, cambia la base a `develop`. No resetees ni descartes cambios para crear la rama.

## Commit 1: Swagger y contratos

```powershell
git add api/package.json api/package-lock.json api/src/main.ts api/src/compartido/configurar-http.ts api/src/compartido/documentacion/swagger.ts api/src/compartido/documentacion/api-errores.ts api/src/compartido/documentacion/respuesta-error.dto.ts api/src/modules/acceso/adaptadores-entrada/auth.controller.ts api/src/modules/acceso/adaptadores-entrada/inicio-sesion.dto.ts api/src/modules/acceso/adaptadores-entrada/sesion-respuesta.dto.ts api/src/modules/configuracion/adaptadores-entrada/actualizar-cupos.dto.ts api/src/modules/configuracion/adaptadores-entrada/actualizar-umbral.dto.ts api/src/modules/configuracion/adaptadores-entrada/actualizar-tarifas.dto.ts api/src/modules/configuracion/adaptadores-entrada/configuracion-respuesta.dto.ts api/src/modules/configuracion/adaptadores-entrada/cupos.controller.ts api/src/modules/configuracion/adaptadores-entrada/umbral.controller.ts api/src/modules/configuracion/adaptadores-entrada/tarifas.controller.ts
git diff --cached --stat
git commit -m "feat(api): documentar y validar los endpoints con Swagger"
```

Incluye esquemas de entrada y salida, autorización Bearer, errores compartidos, documentación interactiva, límites de cupos y comandos de pruebas.

## Commit 2: Verificación y guía

```powershell
git add api/src/compartido/documentacion/swagger.spec.ts api/src/compartido/pruebas/api-completa.integracion.spec.ts api/src/compartido/pruebas/base-datos-pruebas.ts api/README.md api/docs/PRUEBAS_BACKEND.md api/docs/ENTREGA_SWAGGER.md
git diff --cached --stat
git commit -m "test(api): verificar endpoints y persistencia con PostgreSQL real"
```

Incluye pruebas de Swagger, el recorrido HTTP integrado, rollback de lotes, permisos y comprobación estricta del nombre de la base de pruebas antes de limpiarla.

## Validar y subir

Con PostgreSQL y Redis de pruebas disponibles:

```powershell
cd api
npm run lint
npm run build
npm test -- --runInBand
npm run test:integracion
cd ..
git status --short
git log -2 --oneline
git push -u origin fix/swagger-backend
```

Título sugerido del PR: **Documentar y verificar la API de autenticación y configuración con Swagger**.

No agregues `.env`, credenciales, `node_modules`, `dist`, archivos generados de Next.js ni cambios de otra tarea. Los archivos previos `api/src/modules/carril/aplicacion/sensor-presencia.ts` y `web/AGENTS.md` no forman parte de esta entrega. Evita `git add .`.

## Verlo en Docker

Desde la raíz:

```powershell
docker compose up -d --build api
```

Abre <http://localhost:3001/docs/> y sigue el recorrido del README. La documentación puede descargarse desde <http://localhost:3001/docs-json> o <http://localhost:3001/docs-yaml>.

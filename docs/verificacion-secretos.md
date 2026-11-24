# Verificación de secretos

Auditoría de CARQ-237 sobre una copia de CarQ con las ramas de GitHub actualizadas.

- Se revisaron los archivos versionados y el historial alcanzable desde las referencias locales. `.env.example` es el único archivo de entorno versionado.
- Gitleaks detectó dos coincidencias de prueba. En `api/README.md` aparece el parámetro de una insignia con un valor de ejemplo de la [plantilla oficial de NestJS](https://github.com/nestjs/typescript-starter/blob/master/README.md). Se verificó la coincidencia con la plantilla. En `seguridad-logs.integracion.spec.ts` aparece la clave ficticia que usa la prueba de CARQ-221. El escaneo no detectó credenciales reales ni secretos JWT de despliegue.
- Las reglas de Git ignoran `.env` y sus variantes, incluida `.env.local`, y permiten versionar `.env.example`.

Para repetir la revisión desde la raíz, usa [Gitleaks](https://github.com/gitleaks/gitleaks) y Git. El informe de Gitleaks sale redactado y queda fuera del repositorio.

```sh
git fetch origin --prune
git ls-files -- ".env*" ":(glob)**/.env*"
git log --all --full-history --name-only -- ".env" ".env.*" ":(glob)**/.env" ":(glob)**/.env.*"
git check-ignore --no-index .env .env.local
gitleaks git --redact=100 --log-opts="--all" .
```

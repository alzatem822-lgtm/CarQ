import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const web = "http://127.0.0.1:3000/login";
const api = "http://127.0.0.1:3001";

async function esperarHttp(url) {
  const limite = Date.now() + 60_000;
  do {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (respuesta.ok) return respuesta;
    } catch {
      // El contenedor puede seguir iniciando.
    }
    await setTimeout(1000);
  } while (Date.now() < limite);
  throw new Error(`No respondió ${url} después del arranque.`);
}

async function verificarUsuario(nombre, rol) {
  const sesion = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, contrasena: `${nombre}123` }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(sesion.status, 200, `Debe iniciar sesión el rol ${rol}`);
  const { token, rol: rolRecibido } = await sesion.json();
  assert.equal(rolRecibido, rol);
  assert.ok(typeof token === "string" && token.length > 0);

  const validacion = await fetch(`${api}/auth/sesion`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(validacion.status, 200);
  assert.equal((await validacion.json()).rol, rol);
}

const [pantalla, swagger] = await Promise.all([
  esperarHttp(web),
  esperarHttp(`${api}/docs-json`),
]);
assert.match(await pantalla.text(), /Inicia tu sesión/u);
assert.ok((await swagger.json()).paths["/auth/login"]?.post);

await verificarUsuario("operador", "OPERADOR");
await verificarUsuario("administrador", "ADMINISTRADOR");
console.log(
  "Arranque verificado con frontend, Swagger y ambas cuentas de prueba.",
);

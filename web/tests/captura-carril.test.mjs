import { test as testNodo } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Carga el cliente sin resolución de alias Next; fetch y sesión son dobles de prueba.
const sesion = { token: 'token-prueba', limpiarSesion() {} };
const cargar = (ruta, dependencias) => {
  const javascript = ts.transpileModule(fs.readFileSync(new URL(ruta, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', javascript)((nombre) => dependencias[nombre], modulo, modulo.exports);
  return modulo.exports;
};
const cliente = cargar('../src/lib/cliente-http.ts', { './sesion': {
  obtenerToken: () => sesion.token, limpiarSesion: () => sesion.limpiarSesion(),
} });
const carril = cargar('../src/lib/carril.ts', { './cliente-http': cliente });

testNodo('captura envía multipart sin Content-Type fijo y conserva JWT en ambos sentidos', async (t) => {
  const llamadas = [];
  const anterior = globalThis.fetch;
  t.after(() => { globalThis.fetch = anterior; });
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return new Response(JSON.stringify({ resultado: 'REQUIERE_LECTURA_MANUAL', motivo: 'Revisar placa' }), { status: 200 });
  };
  for (const sentido of ['ENTRADA', 'SALIDA']) {
    const resultado = await carril.procesarImagenCarril(sentido, new Blob(['jpeg'], { type: 'image/jpeg' }), new AbortController().signal);
    assert.equal(resultado.motivo, 'Revisar placa');
  }
  assert.ok(llamadas[0].url.endsWith('/carril/ingreso'));
  assert.ok(llamadas[1].url.endsWith('/carril/salida'));
  for (const { opciones } of llamadas) {
    assert.equal(opciones.method, 'POST');
    assert.equal(opciones.headers.get('Authorization'), 'Bearer token-prueba');
    assert.equal(opciones.headers.has('Content-Type'), false);
    assert.ok(opciones.body instanceof FormData);
    assert.equal(opciones.body.get('imagen').type, 'image/jpeg');
  }
});

testNodo('las peticiones JSON conservan Content-Type y los errores no se convierten en éxito', async (t) => {
  const anterior = globalThis.fetch;
  t.after(() => { globalThis.fetch = anterior; });
  globalThis.fetch = async (_url, opciones) => {
    assert.equal(opciones.headers.get('Content-Type'), 'application/json');
    return new Response(JSON.stringify({ codigo: 'ERROR_PRUEBA', motivo: 'Sin confirmación' }), { status: 422 });
  };
  await assert.rejects(cliente.peticion('/ruta', { method: 'POST', body: JSON.stringify({ placa: 'ABC123' }) }),
    error => error instanceof cliente.ErrorApi && error.estado === 422);
});

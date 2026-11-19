import assert from 'node:assert/strict';
import test from 'node:test';
import { enlacesPara, esRutaProtegida, puedeAcceder } from '../src/lib/permisos.ts';
import { parsearSesion } from '../src/lib/sesion.ts';

test('el operador solo navega por las pantallas de operación y consulta', () => {
  assert.deepEqual(enlacesPara('OPERADOR').map(({ ruta }) => ruta), [
    '/inicio', '/carril', '/caja', '/consulta',
  ]);
  assert.equal(puedeAcceder('OPERADOR', '/administracion'), false);
  assert.equal(puedeAcceder('OPERADOR', '/administracion/tarifas'), false);
});

test('el administrador solo navega por administración y consulta', () => {
  assert.deepEqual(enlacesPara('ADMINISTRADOR').map(({ ruta }) => ruta), [
    '/inicio', '/administracion', '/consulta',
  ]);
  assert.equal(puedeAcceder('ADMINISTRADOR', '/carril'), false);
  assert.equal(puedeAcceder('ADMINISTRADOR', '/caja'), false);
});

test('las URL protegidas requieren sesión y el login es público', () => {
  for (const ruta of ['/inicio', '/carril', '/caja', '/consulta', '/administracion']) {
    assert.equal(esRutaProtegida(ruta), true);
    assert.equal(puedeAcceder(null, ruta), false);
  }
  assert.equal(esRutaProtegida('/login'), false);
  assert.equal(puedeAcceder(null, '/login'), true);
});

test('una sesión vacía o con un rol desconocido se trata como ausente', () => {
  assert.equal(parsearSesion('{"token":"","rol":"ADMINISTRADOR"}'), null);
  assert.equal(parsearSesion('{"token":"   ","rol":"OPERADOR"}'), null);
  assert.equal(parsearSesion('{"token":"abc","rol":"DESCONOCIDO"}'), null);
});

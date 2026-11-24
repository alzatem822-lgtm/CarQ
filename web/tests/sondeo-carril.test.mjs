import assert from "node:assert/strict";
import test from "node:test";
import { iniciarSondeoCarril } from "../src/lib/sondeo-carril.ts";

const vaciarPromesas = () => new Promise((resolve) => setImmediate(resolve));
const estado = { vehiculoPresente: false };

test("consulta al iniciar y cada segundo, entregando los estados nuevos", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let consultas = 0;
  const recibidos = [];
  const detener = iniciarSondeoCarril(
    async () => ({ ...estado, vehiculoPresente: consultas++ > 0 }),
    (valor) => recibidos.push(valor),
    assert.fail,
  );
  t.after(detener);
  await vaciarPromesas();
  assert.equal(consultas, 1);
  t.mock.timers.tick(999);
  await vaciarPromesas();
  assert.equal(consultas, 1);
  t.mock.timers.tick(1);
  await vaciarPromesas();
  assert.equal(consultas, 2);
  assert.deepEqual(
    recibidos.map((valor) => valor.vehiculoPresente),
    [false, true],
  );
  t.mock.timers.tick(1000);
  await vaciarPromesas();
  assert.equal(consultas, 3);
});

test("no solapa consultas lentas ni publica una respuesta después de detenerse", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  let consultas = 0;
  let completar;
  let signal;
  const recibidos = [];
  const errores = [];
  const detener = iniciarSondeoCarril(
    (actual) => {
      consultas++;
      signal = actual;
      return new Promise((resolve) => {
        completar = resolve;
      });
    },
    (valor) => recibidos.push(valor),
    (error) => errores.push(error),
  );
  t.after(detener);
  t.mock.timers.tick(3000);
  assert.equal(consultas, 1);
  detener();
  assert.equal(signal.aborted, true);
  completar(estado);
  await vaciarPromesas();
  t.mock.timers.tick(3000);
  await vaciarPromesas();
  assert.equal(consultas, 1);
  assert.deepEqual(recibidos, []);
  assert.deepEqual(errores, []);
});

test("comunica un fallo y vuelve a consultar en el siguiente intervalo", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const error = new Error("Sin conexión");
  let consultas = 0;
  const errores = [];
  const recibidos = [];
  const detener = iniciarSondeoCarril(
    async () => {
      if (consultas++ === 0) throw error;
      return estado;
    },
    (valor) => recibidos.push(valor),
    (fallo) => errores.push(fallo),
  );
  t.after(detener);
  await vaciarPromesas();
  assert.deepEqual(errores, [error]);
  assert.deepEqual(recibidos, []);
  t.mock.timers.tick(1000);
  await vaciarPromesas();
  assert.equal(consultas, 2);
  assert.deepEqual(recibidos, [estado]);
});

test("ignora el rechazo provocado por cancelar una consulta al desmontar", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const errores = [];
  const detener = iniciarSondeoCarril(
    (signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("Cancelada")), {
          once: true,
        });
      }),
    assert.fail,
    (error) => errores.push(error),
  );
  detener();
  await vaciarPromesas();
  assert.deepEqual(errores, []);
});

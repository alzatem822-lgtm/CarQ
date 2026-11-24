import { spawnSync } from "node:child_process";
import { constants, copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const carpetaLpr = fileURLToPath(new URL("../lpr/", import.meta.url));
const ejemplo = new URL("../.env.example", import.meta.url);
const entornoLocal = new URL("../.env", import.meta.url);
const npm = process.env.npm_execpath;

function ejecutar(nombre, programa, argumentos, cwd = raiz) {
  console.log(`\n=== ${nombre} ===`);
  const resultado = spawnSync(programa, argumentos, {
    cwd,
    env: entornoPruebas,
    stdio: "inherit",
  });

  if (resultado.error || resultado.status !== 0) {
    const detalle =
      resultado.error?.message ??
      resultado.signal ??
      `código ${resultado.status}`;
    console.error(`\nFalló ${nombre}: ${detalle}.`);
    process.exit(resultado.status || 1);
  }
}

function ejecutarNpm(nombre, argumentos) {
  ejecutar(nombre, process.execPath, [npm, ...argumentos]);
}

if (!npm) {
  console.error("Ejecuta npm test desde la raíz de CarQ.");
  process.exit(1);
}

try {
  copyFileSync(ejemplo, entornoLocal, constants.COPYFILE_EXCL);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}

const valoresPruebas = parseEnv(readFileSync(ejemplo, "utf8"));
const entornoPruebas = {
  ...process.env,
  URL_BASE_DATOS_PRUEBAS: valoresPruebas.URL_BASE_DATOS_PRUEBAS,
  URL_REDIS_PRUEBAS: valoresPruebas.URL_REDIS_PRUEBAS,
  URL_LPR_PRUEBAS: valoresPruebas.URL_LPR_PRUEBAS,
};

ejecutar("PostgreSQL, Redis y OCR de pruebas", "docker", [
  "compose",
  "--env-file",
  ".env.example",
  "--profile",
  "pruebas",
  "--profile",
  "ocr",
  "up",
  "-d",
  "--build",
  "--wait",
  "--wait-timeout",
  "120",
  "db_pruebas",
  "redis_pruebas",
  "lpr",
]);
ejecutarNpm("Unitarias de la API", [
  "--prefix",
  "api",
  "test",
  "--",
  "--runInBand",
]);
ejecutarNpm("Unitarias del frontend", ["--prefix", "web", "test"]);
ejecutar(
  "Pruebas del servicio LPR",
  "python",
  ["-m", "pytest", "-q"],
  carpetaLpr,
);
ejecutarNpm("Integración con PostgreSQL y Redis", [
  "--prefix",
  "api",
  "run",
  "test:integracion",
]);
ejecutarNpm("Integración con OCR real", ["--prefix", "api", "run", "test:lpr"]);
ejecutarNpm("E2E de navegación y Cámara", [
  "--prefix",
  "web",
  "run",
  "test:e2e",
  "--",
  "--config=playwright.navegacion.config.ts",
]);
ejecutarNpm("E2E del operador", [
  "--prefix",
  "web",
  "run",
  "test:e2e:operador",
]);
ejecutarNpm("E2E de Administración y Consulta", [
  "--prefix",
  "web",
  "run",
  "test:e2e:administracion",
]);

console.log("\nSuite de CarQ completada.");

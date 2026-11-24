import { spawnSync } from "node:child_process";
import { constants, copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const ejemplo = new URL("../.env.example", import.meta.url);
const archivoEntorno = new URL("../.env", import.meta.url);

try {
  copyFileSync(ejemplo, archivoEntorno, constants.COPYFILE_EXCL);
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}

function compose(...argumentos) {
  const resultado = spawnSync("docker", ["compose", ...argumentos], {
    cwd: raiz,
    stdio: "inherit",
  });
  if (resultado.error || resultado.status !== 0) {
    console.error(
      `No se completó el arranque: ${resultado.error?.message ?? resultado.signal ?? `código ${resultado.status}`}.`,
    );
    process.exit(resultado.status || 1);
  }
}

// Las cuentas de demostración se crean solo en la base local de Compose.
const { URL_BASE_DATOS } = parseEnv(readFileSync(archivoEntorno, "utf8"));
const destino = URL.canParse(URL_BASE_DATOS ?? "")
  ? new URL(URL_BASE_DATOS)
  : null;
if (
  destino?.protocol !== "postgresql:" ||
  destino.hostname !== "db" ||
  destino.pathname !== "/carq" ||
  (destino.port && destino.port !== "5432")
) {
  console.error(
    "El arranque local requiere URL_BASE_DATOS apuntando a db:5432/carq en Docker Compose.",
  );
  process.exit(1);
}

compose("up", "-d", "--wait", "--wait-timeout", "120", "db", "redis", "mqtt");
compose("build", "api", "web");
compose(
  "run",
  "--rm",
  "--no-deps",
  "-T",
  "api",
  "sh",
  "-ec",
  'export URL_BASE_DATOS_MIGRACIONES="$URL_BASE_DATOS"; node node_modules/typeorm/cli.js migration:run -d dist/compartido/base-datos/origen-datos.js && node dist/compartido/base-datos/ejecutar-seeds.js',
);
compose(
  "up",
  "-d",
  "--no-build",
  "--wait",
  "--wait-timeout",
  "120",
  "api",
  "web",
);

console.log("CarQ: http://localhost:3000/login");
console.log("Swagger: http://localhost:3001/docs");

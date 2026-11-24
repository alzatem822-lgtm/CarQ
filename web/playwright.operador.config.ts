import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

process.loadEnvFile(resolve(__dirname, "../.env"));
const basePruebas = new URL(process.env.URL_BASE_DATOS_PRUEBAS ?? "");
if (!basePruebas.pathname.endsWith("_pruebas"))
  throw new Error("Falta PostgreSQL de pruebas");
basePruebas.pathname = "/carq_e2e_pruebas";
process.env.CARQ_E2E_DB_URL = basePruebas.toString();

export default defineConfig({
  testDir: "./e2e-operador",
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3102",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "node --env-file=../.env -r ts-node/register test-e2e/servidor.ts",
      cwd: resolve(__dirname, "../api"),
      url: "http://127.0.0.1:3101/docs-json",
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3102",
      cwd: __dirname,
      env: { CARQ_E2E: "1", NEXT_PUBLIC_URL_API: "http://127.0.0.1:3101" },
      url: "http://127.0.0.1:3102/login",
      reuseExistingServer: false,
      timeout: 90000,
    },
  ],
});

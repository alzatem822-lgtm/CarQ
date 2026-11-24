import { defineConfig } from "@playwright/test";
import configuracionReal from "./playwright.operador.config";

export default defineConfig({
  ...configuracionReal,
  testDir: "./e2e-administracion",
});

import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3102";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3102",
    cwd: __dirname,
    env: { CARQ_E2E: "1", NEXT_PUBLIC_URL_API: "http://localhost:3001" },
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 90000,
  },
});

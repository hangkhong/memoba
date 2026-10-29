import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
try { loadEnvFile(".env.local"); } catch { /* Environment can be supplied by CI. */ }
export default defineConfig({
  testDir: "./tests/e2e",
  grepInvert: process.env.RUN_LIVE_MODEL_TESTS === "1" ? undefined : /@live/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", trace: "off", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npx next dev --port 3100", env: { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: process.env.RUN_LIVE_MODEL_TESTS === "1" ? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "" : "", OPENAI_API_KEY: process.env.RUN_LIVE_MODEL_TESTS === "1" ? process.env.OPENAI_API_KEY ?? "" : "" }, url: "http://localhost:3100", reuseExistingServer: false, timeout: 60000 },
});

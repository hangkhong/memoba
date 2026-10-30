import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { z } from "zod";

try { loadEnvFile(".env.local"); } catch { /* CI may supply the environment. */ }
const evidence = z.string().min(1).parse(process.env.MEMOBA_VERIFY_EVIDENCE);
const root = fileURLToPath(new URL("../../../", import.meta.url));
export default defineConfig({
  testDir: fileURLToPath(new URL("./proof", import.meta.url)),
  outputDir: path.join(evidence, "playwright"),
  reporter: [["list"], ["json", { outputFile: path.join(evidence, "results.json") }]],
  workers: 1,
  retries: 0,
  expect: { timeout: 15000 },
  timeout: 120000,
  use: { baseURL: "http://localhost:3100", trace: "off", screenshot: "off", video: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --port 3100",
    cwd: root,
    url: "http://localhost:3100/login",
    reuseExistingServer: false,
    timeout: 60000,
    env: { ...process.env, GOOGLE_GENERATIVE_AI_API_KEY: process.env.MEMOBA_VERIFY_LIVE === "1" ? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "" : "", OPENAI_API_KEY: process.env.MEMOBA_VERIFY_LIVE === "1" ? process.env.OPENAI_API_KEY ?? "" : "" },
  },
});

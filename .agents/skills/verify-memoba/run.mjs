#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadEnvFile } from "node:process";

const root = fileURLToPath(new URL("../../../", import.meta.url));
process.chdir(root);
try { loadEnvFile(".env.local"); } catch { /* Environment may be supplied by the caller. */ }
if (process.argv.length !== 2) throw new Error("Usage: .agents/skills/verify-memoba/run.mjs");
if (existsSync(".next/dev/lock")) throw new Error("A Next.js dev lock exists. Stop its owner before verification. Do not delete a live lock.");
const probe = createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(3100, () => probe.close(resolve));
});
const stamp = new Date().toISOString().replaceAll(":", "-");
const evidence = path.join(root, ".superpowers/verification", stamp);
mkdirSync(evidence, { recursive: true, mode: 0o700 });
process.stdout.write(`Evidence: ${evidence}\n`);
const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--config", ".agents/skills/verify-memoba/playwright.config.mjs"], {
  stdio: "inherit", env: { ...process.env, MEMOBA_VERIFY_EVIDENCE: evidence },
});
// Failure-context files can include login input. Redact credential values before publishing artifacts.
const credentials = [process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD].filter((value) => value && value.length >= 8);
function redact(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) redact(file);
    else if (/\.(json|txt|md)$/.test(file)) {
      const original = readFileSync(file, "utf8");
      const redacted = credentials.reduce((text, value) => text.replaceAll(value, "[REDACTED]"), original);
      if (redacted !== original) writeFileSync(file, redacted);
    }
  }
}
redact(evidence);
// Playwright owns its browser and webServer and tears both down before returning.
const port = createServer();
let released = false;
try {
  await new Promise((resolve, reject) => {
    port.once("error", reject);
    port.listen(3100, () => port.close(resolve));
  });
  released = true;
} catch { /* Record cleanup failure without killing an unrelated process. */ }
// The lock did not exist at launch. Remove only this run's unopened residue.
const lock = path.join(root, '.next/dev/lock');
let lockReleased = !existsSync(lock);
if (released && !lockReleased) {
  const owner = spawnSync('lsof', [lock], { encoding: 'utf8' });
  if (owner.status === 1) { unlinkSync(lock); lockReleased = true; }
}
const proofExists = ["auth/after-refresh.png", "auth/actions.json", "results.json"].every((file) => existsSync(path.join(evidence, file)));
writeFileSync(path.join(evidence, "cleanup.json"), JSON.stringify({
  playwrightExitCode: result.status, signal: result.signal,
  port3100Released: released, devLockReleased: lockReleased, evidenceSurvived: proofExists,
  databaseStopped: false,
}, null, 2) + "\n");
if (result.error) process.stderr.write(`${result.error.message}\n`);
process.exitCode = result.status === 0 && released && lockReleased && proofExists ? 0 : 1;

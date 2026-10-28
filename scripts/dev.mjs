import { execFileSync, spawn } from "node:child_process";
import { realpathSync } from "node:fs";

const root = realpathSync(process.cwd());
function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}
function listeners() {
  try {
    return execFileSync("lsof", ["-nP", "-t", "-iTCP:3000", "-sTCP:LISTEN"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}
function replaceOldServer() {
  for (const pid of listeners()) {
    const command = execFileSync("ps", ["-p", pid, "-o", "command="], { encoding: "utf8" }).trim();
    const cwd = execFileSync("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { encoding: "utf8" }).split("\n").find((line) => line.startsWith("n"))?.slice(1);
    if (!command.startsWith("next-server") || !cwd || realpathSync(cwd) !== root) {
      throw new Error(`Port 3000 is used by another process (PID ${pid}). Stop it before starting Memoba.`);
    }
    process.stdout.write(`Stopping the previous Memoba server (PID ${pid}).\n`);
    process.kill(Number(pid), "SIGTERM");
  }
}
try {
  replaceOldServer();
  process.stdout.write("Starting local Supabase...\n");
  try {
    execFileSync("./node_modules/.bin/supabase", ["start", "--runtime", "native", "--output-format", "json"], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 });
  } catch {
    throw new Error("Could not start local Supabase. Run npx supabase start --runtime native for diagnostics.");
  }
  run("./node_modules/.bin/supabase", ["migration", "up", "--local"]);
  run(process.execPath, ["--experimental-strip-types", "scripts/configure-local.ts"]);
  run(process.execPath, ["--env-file-if-exists=.env.local", "--experimental-strip-types", "scripts/seed-demo.ts"]);
  const child = spawn("./node_modules/.bin/next", ["dev", "--port", "3000"], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 0; });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Local startup failed."}\n`);
  process.exitCode = 1;
}

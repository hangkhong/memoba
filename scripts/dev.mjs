import { execFileSync, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { formatLocalEndpoints, findStudioUrl, parseNativeStack } from "../src/lib/supabase/local-stack.ts";
import { cli, cliDbUrl, stackArgs } from "./local-stack.ts";

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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const pids = listeners();
  for (const pid of pids) {
    const command = execFileSync("ps", ["-p", pid, "-o", "command="], { encoding: "utf8" }).trim();
    process.stdout.write(`Port 3000 is in use. Stopping PID ${pid} (${command.slice(0, 80)}).\n`);
    process.kill(Number(pid), "SIGTERM");
  }
  for (let attempt = 0; attempt < 20 && listeners().length > 0; attempt++) await sleep(250);
  for (const pid of listeners()) process.kill(Number(pid), "SIGKILL");
  for (let attempt = 0; attempt < 20 && listeners().length > 0; attempt++) await sleep(250);
  if (listeners().length > 0) throw new Error("Port 3000 is still in use after stopping its process. Stop it manually.");
}
try {
  await freePort();
  process.stdout.write("Starting local Supabase...\n");
  let started;
  try {
    started = execFileSync(cli, ["start", ...stackArgs(), "--runtime", "native", "--output-format", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 });
  } catch {
    throw new Error("Could not start local Supabase. Run npx supabase start --runtime native for diagnostics.");
  }
  let stack = parseNativeStack(JSON.parse(started));
  run(cli, ["migration", "up", "--db-url", cliDbUrl(stack)]);
  run(process.execPath, ["--experimental-strip-types", "scripts/configure-local.ts"]);
  run(process.execPath, ["--env-file-if-exists=.env.local", "--experimental-strip-types", "scripts/seed-demo.ts"]);
  if (!findStudioUrl(stack.endpoints)) {
    stack = parseNativeStack(JSON.parse(execFileSync(cli, ["status", ...stackArgs(), "--output-format", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })));
  }
  process.stdout.write(`${formatLocalEndpoints(stack, "http://localhost:3000")}\n`);
  const client = createClient(stack.url, stack.secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const revisions = await client.from("case_revisions").select("id", { count: "exact", head: true }).eq("workspace_id", "20000000-0000-4000-8000-000000000010");
  if (!revisions.error && revisions.count === 0) process.stdout.write("Knowledge Hub is empty. Run npm run db:seed -- --demo.\n");
  const child = spawn("./node_modules/.bin/next", ["dev", "--port", "3000"], { stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
  child.on("exit", (code) => { process.exitCode = code ?? 0; });
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Local startup failed."}\n`);
  process.exitCode = 1;
}

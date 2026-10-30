import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parseNativeStack } from "../src/lib/supabase/local-stack.ts";

export const cli = "./node_modules/.bin/supabase";
const pinKey = "SUPABASE_STACK_ID=";

// The native backend derives a stack from the git branch, so every local command opens one pinned stack by id.
export function pinnedStackId() {
  const line = existsSync(".env.local") ? readFileSync(".env.local", "utf8").split("\n").find((entry) => entry.startsWith(pinKey)) : undefined;
  const id = line?.slice(pinKey.length).trim();
  return id && /^[0-9a-f]{64}$/.test(id) ? id : undefined;
}
export function stackArgs() {
  const id = pinnedStackId();
  return id ? ["--stack-id", id] : [];
}
export function readLocalStack() {
  try {
    const output = execFileSync(cli, ["status", ...stackArgs(), "--output-format", "json"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15000,
    });
    const raw: unknown = JSON.parse(output);
    return parseNativeStack(raw);
  } catch { throw new Error("Local native stack unavailable. Run npm run dev to start the pinned stack."); }
}
// The local Postgres serves plaintext only, and `--db-url` attempts TLS unless told otherwise.
export function cliDbUrl(stack: { dbUrl: string }) {
  const url = new URL(stack.dbUrl);
  url.searchParams.set("sslmode", "disable");
  return url.toString();
}

import { execFileSync } from "node:child_process";
import { parseNativeStack } from "../src/lib/supabase/local-stack.ts";

export function readLocalStack() {
  try {
    const output = execFileSync("./node_modules/.bin/supabase", ["status", "--output-format", "json"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15000,
    });
    const raw: unknown = JSON.parse(output);
    return parseNativeStack(raw);
  } catch { throw new Error("Local native stack unavailable. Run npx supabase start --runtime native --output-format json first."); }
}

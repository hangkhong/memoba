import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readLocalStack } from "./local-stack.ts";

readLocalStack();
try {
  const types = execFileSync("./node_modules/.bin/supabase", ["gen", "types", "typescript", "--local"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
  if (!types.includes("export type Database")) throw new Error("Unsupported generated output");
  writeFileSync("src/lib/supabase/database.types.ts", types.split("\n").map((line) => line.trimEnd()).join("\n"));
  process.stdout.write("Generated database types from local migrations.\n");
} catch { process.stderr.write("Database type generation failed.\n"); process.exitCode = 1; }

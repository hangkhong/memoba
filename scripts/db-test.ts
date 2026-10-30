import { execFileSync } from "node:child_process";
import { cli, cliDbUrl, readLocalStack } from "./local-stack.ts";

try { execFileSync(cli, ["test", "db", "--db-url", cliDbUrl(readLocalStack())], { stdio: "inherit" }); }
catch { process.exitCode = 1; }

import { z } from "zod";
import { demoPrompts } from "../evals/demo/prompts.ts";

// Drives the running app as the demo user so each saved conversation holds a real, completed run.
const config = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12).max(128) });
const listSchema = z.array(z.object({ id: z.uuid() }));
const turnSchema = z.object({ turnId: z.uuid() });

function appUrl() {
  const flag = process.argv.indexOf("--app-url");
  const raw = (flag >= 0 ? process.argv[flag + 1] : undefined) ?? process.env.APP_URL;
  const parsed = z.url({ protocol: /^https?$/ }).safeParse(raw);
  if (!parsed.success) throw new Error("Pass --app-url <url> or set APP_URL to the running app (for example http://localhost:3000).");
  return new URL(parsed.data).origin;
}

async function seedConversations() {
  const credentials = config.safeParse(process.env);
  if (!credentials.success) throw new Error("Set DEMO_EMAIL and DEMO_PASSWORD (12+ characters) in .env.local.");
  const origin = appUrl();
  const login = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ email: credentials.data.DEMO_EMAIL, password: credentials.data.DEMO_PASSWORD }) });
  if (!login.ok) throw new Error(`Demo sign-in failed with status ${login.status}.`);
  const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  async function call(path: string, init: { method: string; body?: unknown; headers?: Record<string, string> }) {
    return fetch(`${origin}${path}`, { method: init.method, headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json", ...init.headers }, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  }
  const existing = listSchema.parse(await (await call("/api/conversations", { method: "GET" })).json());
  if (existing.length > 0) { process.stdout.write(`Workspace already has ${existing.length} conversations; run npm run demo:reset first to replace them.\n`); return; }
  // Oldest first so the last prompt is the most recent in the sidebar.
  for (const prompt of [...demoPrompts].reverse()) {
    const conversation = crypto.randomUUID();
    const created = await call("/api/conversations", { method: "POST", body: { id: conversation } });
    if (!created.ok) throw new Error(`Cannot create conversation for "${prompt.label}" (${created.status}).`);
    const turn = await call(`/api/conversations/${conversation}/turns`, { method: "POST", body: { key: crypto.randomUUID(), parentTurnId: null, message: prompt.message } });
    if (!turn.ok) throw new Error(`Cannot save the question for "${prompt.label}" (${turn.status}).`);
    const { turnId } = turnSchema.parse(await turn.json());
    const run = await call(`/api/conversations/${conversation}/turns/${turnId}/analyses`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } });
    if (!run.ok) throw new Error(`Analysis for "${prompt.label}" was refused (${run.status}). Check that the AI key is configured.`);
    const stream = await run.text();
    if (!stream.includes('"type":"data-result"')) throw new Error(`Analysis for "${prompt.label}" did not finish.`);
    process.stdout.write(`Seeded conversation: ${prompt.label}\n`);
  }
}
seedConversations().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message + "\n" : "Conversation seed failed.\n"); process.exitCode = 1; });

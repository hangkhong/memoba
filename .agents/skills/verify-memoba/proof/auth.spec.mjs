import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { z } from "zod";

test("auth: real sign-in, persisted membership, refresh, and sign-out", async ({ page }) => {
  const env = z.object({
    DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12),
    MEMOBA_VERIFY_EVIDENCE: z.string().min(1),
  }).parse(process.env);
  const dir = path.join(env.MEMOBA_VERIFY_EVIDENCE, "auth");
  mkdirSync(dir, { recursive: true });
  const actions = [];
  function record(action) {
    actions.push({ action, at: new Date().toISOString() });
    writeFileSync(path.join(dir, "actions.json"), JSON.stringify(actions, null, 2) + "\n");
  }
  async function capture(name) {
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    writeFileSync(path.join(dir, `${name}.aria.txt`), await page.locator("body").ariaSnapshot());
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Open workspace", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/workspace/chat");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
  record("Open /workspace anonymously; redirected to /login; workspace API returns 401.");
  await capture("before-sign-in");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  // Never trace, snapshot, or capture the filled credential form.
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What are you working on?", exact: true })).toBeVisible();
  record("Submit Sign in through the UI; Chat opens.");
  const response = await page.request.get("/api/workspace");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const workspace = z.object({ workspaceId: z.uuid() }).parse(await response.json());
  expect(workspace.workspaceId).toBe("20000000-0000-4000-8000-000000000010");
  record("Doctor: authenticated /api/workspace returns the seeded workspace and no-store.");
  writeFileSync(path.join(dir, "doctor.json"), JSON.stringify({ status: response.status(), workspaceId: workspace.workspaceId, cacheControl: response.headers()["cache-control"] }, null, 2) + "\n");
  await page.reload();
  await expect(page.getByRole("heading", { name: "What are you working on?", exact: true })).toBeVisible();
  expect((await page.request.get("/api/workspace")).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "What are you working on?", exact: true })).toHaveCSS("font-size", "22px");
  record("Reload Chat; session and workspace access survive; Tailwind heading styling is applied.");
  await capture("after-refresh");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
  record("Choose Sign out; return to /login; workspace API returns 401.");
  await capture("after-sign-out");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("outsider@memoba.local");
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Workspace unavailable for this account.", { exact: true })).toBeVisible();
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
  await page.getByLabel("Email", { exact: true }).fill("");
  await page.getByLabel("Password", { exact: true }).fill("");
  record("Landing, protected chat, direct login, mobile sign-out, and outsider denial exercised.");
});

test.afterEach(async ({page}, info) => {
  if (info.status !== info.expectedStatus) {
    writeFileSync(path.join(process.env.MEMOBA_VERIFY_EVIDENCE, "doctor-after-auth.txt"), execFileSync("npm", ["run", "doctor"], {encoding:"utf8", timeout:30000}));
  }
  for (const label of ["Email", "Password"]) {
    const input = page.getByLabel(label, {exact:true});
    if (await input.count()) await input.fill("");
  }
});

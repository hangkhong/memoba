import { expect, test } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

test("anonymous workspace access requires sign-in", async ({ page, request }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const response = await request.get("/api/workspace");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("member login reaches the workspace and survives refresh without AI", async ({ page, request }) => {
  const env = credentials.parse(process.env);
  // Sign in through the actual UI. Do not save traces or screenshots containing credentials.
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "What are you working on?" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "What are you working on?" })).toBeVisible();
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true, caret: "initial" });
  const response = await page.request.get("/api/workspace?workspaceId=20000000-0000-4000-8000-000000000002");
  expect(response.status()).toBe(200);
  const raw: unknown = await response.json();
  expect(z.object({ workspaceId: z.uuid() }).parse(raw).workspaceId).toBe("20000000-0000-4000-8000-000000000010");
  expect((await request.post("/api/auth/logout", { headers: { origin: "https://other.invalid" } })).status()).toBe(400);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
});

test("authenticated nonmember cannot enter the workspace", async ({ request }) => {
  const env = credentials.parse(process.env);
  const response = await request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: "outsider@memoba.local", password: env.DEMO_PASSWORD } });
  expect(response.status()).toBe(404);
  expect((await request.get("/api/workspace")).status()).toBe(401);
});

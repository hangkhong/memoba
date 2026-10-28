import { expect, test } from "@playwright/test";
import { z } from "zod";
const credentials = z.object({ DEMO_EMAIL: z.email(), DEMO_PASSWORD: z.string().min(12) });

test("anonymous workspace access requires sign-in", async ({ page, request }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Memory Bank Demo" })).toBeVisible();
  await expect(page.getByText("AI analysis is unavailable", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Memory Bank Demo" })).toBeVisible();
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true });
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

test("structured intake keeps constraints and reports unavailable analysis honestly", async ({ page }) => {
  const env = credentials.parse(process.env);
  const login = await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } });
  expect(login.status()).toBe(200);
  await page.goto("/workspace/requests/new");
  await expect(page.getByRole("heading", { name: "Give the next decision some context." })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Request type" })).toContainText("Product / Delivery");
  await page.getByLabel("What do you want to achieve?", { exact: true }).fill("Release a checkout update");
  await page.getByLabel("Context", { exact: true }).fill("A small team wants a controlled rollout.");
  for (let index = 1; index <= 8; index++) {
    await page.getByRole("button", { name: "Add constraint", exact: true }).click();
    await page.getByRole("textbox", { name: `Constraint ${index}`, exact: true }).fill(`Requirement ${index}`);
  }
  await expect(page.getByRole("button", { name: "Add constraint", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Create Reuse Brief", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your request has not been saved or sent to a model.");
  const forged = await page.request.post("/api/analyses", { headers: { origin: "http://localhost:3100" }, data: { objective: "Request", workspaceId: "forged" } });
  expect(forged.status()).toBe(400);
  await page.screenshot({ path: "test-results/structured-request.png", fullPage: true });
});

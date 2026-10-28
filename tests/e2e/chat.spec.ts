import { expect, test } from "@playwright/test";
import { z } from "zod";
import { conversationDetailSchema } from "../../src/modules/conversations/view-schema";

test("chat persists two turns and explicit constraints without model access", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto("/workspace/requests/new");
  await expect(page).toHaveURL(/\/workspace\/chat$/);
  await page.getByLabel("What do you want to achieve?", { exact: true }).fill("Release a checkout update safely");
  await page.getByRole("button", { name: "Send question", exact: true }).click();
  await expect(page.getByText("Add context before sending.", { exact: true })).toBeVisible();
  await page.getByLabel("Context", { exact: true }).fill("A small team wants a controlled rollout.");
  for (let index = 1; index <= 8; index++) {
    await page.getByRole("button", { name: "Add constraint", exact: true }).click();
    await page.getByRole("textbox", { name: `Constraint ${index}`, exact: true }).fill(`Requirement ${index}`);
  }
  await expect(page.getByRole("button", { name: "Add constraint", exact: true })).toBeDisabled();
  // Finish the real unavailable-AI response before allowing the first navigation.
  // Refreshing the old route here must not cancel the conversation navigation.
  let releaseNavigation: () => void = () => {};
  const navigationGate = new Promise<void>((resolve) => { releaseNavigation = resolve; });
  await page.route(/\/workspace\/chat\/[0-9a-f-]+(?:\?|$)/, async (route) => { await navigationGate; await route.continue(); });
  const savedTurn = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/turns"));
  const analysis = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/analyses"));
  await page.getByRole("button", { name: "Send question", exact: true }).click();
  expect((await savedTurn).status()).toBe(200);
  expect((await analysis).status()).toBe(503);
  releaseNavigation();
  await expect(page).toHaveURL(/\/workspace\/chat\/[0-9a-f-]+$/);
  await expect(page.getByRole("status")).toContainText("Your question is saved; no model was called.");
  const id = new URL(page.url()).pathname.split("/").pop();
  const firstResponse = await page.request.get(`/api/conversations/${id}`);
  expect(firstResponse.headers()["cache-control"]).toContain("no-store");
  const first = conversationDetailSchema.parse(await firstResponse.json());
  expect(first.turns).toHaveLength(1); expect(first.turns[0]?.runs).toHaveLength(0);
  expect(first.turns[0]?.request.objective).toBe("Release a checkout update safely");
  await page.getByLabel("Follow-up question", { exact: true }).fill("Only one operator is available.");
  await page.getByRole("button", { name: "Send question", exact: true }).click();
  await expect(page.getByRole("region", { name: "Turn 2", exact: true })).toContainText("Only one operator is available.");
  await expect(page.getByRole("status")).toContainText("Your question is saved; no model was called.");
  const second = conversationDetailSchema.parse(await (await page.request.get(`/api/conversations/${id}`)).json());
  expect(second.turns).toHaveLength(2);
  expect(second.turns[0]?.request).toEqual(first.turns[0]?.request);
  expect(second.turns[1]?.request.hardConstraints).toEqual(first.turns[0]?.request.hardConstraints);
  expect(second.turns[1]?.request.context).toContain("Follow-up from user: Only one operator is available.");
  let analysisCalls = 0;
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith("/analyses")) analysisCalls++; });
  await page.reload();
  await expect(page.getByRole("region", { name: "Turn 2", exact: true })).toBeVisible();
  expect(analysisCalls).toBe(0);
  await page.getByRole("link", { name: "Knowledge Hub", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Knowledge Hub", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Release a checkout update safely", exact: true }).first().click();
  await expect(page.getByRole("region", { name: "Turn 2", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/chat-foundation.png", fullPage: true });
});

test("mobile navigation and conversation API boundaries", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click();
  await page.getByRole("link", { name: "Knowledge Hub", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Knowledge Hub", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Record a case", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-knowledge.png", fullPage: true });
  const origin = { origin: "http://localhost:3100" };
  expect((await page.request.post("/api/conversations", { headers: { origin: "https://other.invalid" }, data: { id: crypto.randomUUID() } })).status()).toBe(400);
  expect((await page.request.post("/api/conversations", { headers: origin, data: { id: crypto.randomUUID(), workspaceId: "forged" } })).status()).toBe(400);
  expect((await page.request.get(`/api/conversations/${crypto.randomUUID()}`)).status()).toBe(404);
  const id = crypto.randomUUID();
  expect((await page.request.post("/api/conversations", { headers: origin, data: { id } })).status()).toBe(200);
  const body = { key: crypto.randomUUID(), parentTurnId: null, message: "How to release?", request: { template: "product_delivery", version: 1, objective: "Release", context: "Small team", hardConstraints: [], conceptIds: [], unknowns: "" } };
  const first = await page.request.post(`/api/conversations/${id}/turns`, { headers: origin, data: body });
  const replay = await page.request.post(`/api/conversations/${id}/turns`, { headers: origin, data: body });
  expect(first.status()).toBe(200); expect(await replay.json()).toEqual(await first.json());
  expect((await page.request.post(`/api/conversations/${id}/turns`, { headers: origin, data: { ...body, key: crypto.randomUUID() } })).status()).toBe(409);
});

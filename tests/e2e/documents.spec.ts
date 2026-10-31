import { expect, test } from "@playwright/test";
import { z } from "zod";

const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() });
async function signIn(request: import("@playwright/test").APIRequestContext) {
  const { DEMO_EMAIL, DEMO_PASSWORD } = env.parse(process.env);
  expect((await request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: DEMO_EMAIL, password: DEMO_PASSWORD } })).status()).toBe(200);
}

test("the Documents tab is addressable and shows the add dialog with a live block preview", async ({ page }) => {
  await signIn(page.request);
  await page.goto("/workspace/knowledge?tab=documents");
  await expect(page.getByRole("tab", { name: "Documents", selected: true })).toBeVisible();
  await page.getByRole("tab", { name: "Use cases" }).click();
  await expect(page).not.toHaveURL(/tab=documents/);
  await page.getByRole("tab", { name: "Documents" }).click();
  await expect(page).toHaveURL(/tab=documents/);
  await page.getByRole("button", { name: "Add document" }).click();
  const dialog = page.getByRole("dialog", { name: "Add document" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(`Travel expenses ${Date.now()}`);
  await dialog.getByLabel("Description", { exact: true }).fill("Use when booking business travel.");
  await dialog.getByLabel("Content", { exact: true }).fill(`## Approval\n\n${"word ".repeat(1000)}\n\n## Claims\n\nFile within 14 days.`);
  await expect(dialog.getByRole("alert", { name: "Problems with the content" })).toContainText("Approval");
  await dialog.getByLabel("Content", { exact: true }).fill("## Approval\n\nGet approval first.\n\n## Claims\n\nFile within 14 days.");
  await expect(dialog.getByLabel("Blocks")).toContainText("2 blocks");
});

test("a document that cannot be indexed is not saved and says so", async ({ page }) => {
  await signIn(page.request);
  const invalid = await page.request.post("/api/documents", { headers: { origin: "http://localhost:3100" }, data: { title: "x", description: "y", body: "z", type: "memo", area: "Finance", owner: "o", effectiveFrom: "2026-01-01" } });
  expect(invalid.status()).toBe(400);
  const offline = await page.request.post("/api/documents", { headers: { origin: "http://localhost:3100" }, data: { title: `Offline ${Date.now()}`, description: "d", body: "## A\n\none\n\n## B\n\ntwo", type: "policy", area: "Finance", owner: "o", effectiveFrom: "2026-01-01" } });
  expect(offline.status()).toBe(503);
  expect(z.object({ error: z.string() }).parse(await offline.json()).error).toContain("Nothing was saved");
});

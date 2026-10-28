import { expect, test } from "@playwright/test";
import { z } from "zod";

test("@live save and index a real case, then preserve it as a revision", async ({ page }) => {
  const env = z.object({ DEMO_EMAIL: z.string(), DEMO_PASSWORD: z.string() }).parse(process.env);
  expect((await page.request.post("/api/auth/login", { headers: { origin: "http://localhost:3100" }, data: { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD } })).status()).toBe(200);
  await page.goto("/workspace/knowledge/new");
  await page.getByLabel("Title", { exact: true }).fill(`Controlled release ${Date.now()}`);
  for (const label of ["Problem / objective", "Context", "Constraints", "Approach and reasoning", "Observed outcome", "Lessons and applicability", "Deliverable", "Change scope", "Deployment conditions"]) await page.getByLabel(label, { exact: true }).fill(`Synthetic demo: ${label}. Use a controlled canary rollout and keep rollback ready.`);
  await page.getByRole("button", { name: "Save case", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\/knowledge\/[0-9a-f-]+$/, { timeout: 90000 });
  await expect(page.getByText("active · Index: ready", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/case-ready.png", fullPage: true });
  const id = new URL(page.url()).pathname.split("/").pop();
  const detail = await page.request.get(`/api/cases/${id}`);
  expect(detail.status()).toBe(200);
  const saved = z.object({ published_revision_id: z.uuid(), revisions: z.array(z.object({ id: z.uuid(), index_state: z.literal("ready") })) }).parse(await detail.json());
  expect(saved.published_revision_id).toBe(saved.revisions[0]?.id);
});
